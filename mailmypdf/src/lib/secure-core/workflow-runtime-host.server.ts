// Mounts the shared generic workflow-runtime contract
// (@mailmypdf/workflows' createPlatformWorkflowRuntimeRequestHandler, the
// canonical runtime handler + policy registry for the new root-level
// architecture) onto this app's existing Supabase-backed secure-core
// primitives — the same persistence, AI gateway, packet builder, pricing,
// and Stripe/Lob fulfillment already used by the v2 case routes.
//
// This is intentionally an adapter, not a second runtime: every read/write
// below delegates to the same case.server / case-analysis.server /
// case-approval.server / workflow-checkout.server functions the v2 routes
// call, through the same request-scoped, user-authorized Supabase client. A
// fresh dependency object is built per request (see handleWorkflowRuntimeRequest)
// so the authenticated context never leaks across concurrent requests.

import {
  createPlatformWorkflowRuntimeRequestHandler,
  WorkflowRuntimeError,
  type ExactPacketApproval,
  type WorkflowDraftBasis,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowMatterRecord,
  type WorkflowMatterSnapshot,
  type WorkflowPacketPreview,
  type WorkflowRuntimeStoredDraft,
  type WorkflowRuntimeStoredInput,
} from "@mailmypdf/workflows";

import { AuthenticationError, requireAuthenticatedUser, type AuthenticatedUserContext } from "./auth.server";
import {
  attachDocument,
  CaseNotFoundError,
  createCase,
  detachDocument,
  listCaseDocuments,
  loadCase,
  reorderDocument,
  setDocumentIncluded,
  type CaseDocument,
  type EvidenceKind,
} from "./case.server";
import {
  generateDraftResponse,
  loadLatestAnalysis,
  persistCaseAnalysis,
  runNoticeAnalysisModel,
  type NoticeAnalysis,
} from "./case-analysis.server";
import { loadLatestCaseDraft, saveCaseDraft } from "./case-draft.server";
import {
  approvePacket,
  assertRecipient,
  materializeApprovedPacket,
  previewPacket,
} from "./case-approval.server";
import { createOrLoadOrder, ensureCheckoutSession } from "./workflow-checkout.server";
import { intakeSecureDocument } from "./document-intake.server";

function toMatterRecord(row: {
  id: string;
  workflow_id: string;
  vertical_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}): WorkflowMatterRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    verticalId: row.vertical_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMatterDocument(row: CaseDocument): WorkflowMatterDocument {
  return {
    id: row.id,
    documentId: row.document_id,
    role: row.role,
    evidenceKind: row.evidence_kind,
    pageCount: row.page_count,
    included: row.included,
    position: row.position,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    securityStatus: row.security_status,
    usable: row.usable,
  };
}

async function storeCreateMatter(
  input: { workflowId: string; verticalId: string },
  context: AuthenticatedUserContext,
): Promise<WorkflowMatterRecord> {
  const created = await createCase({ workflowId: input.workflowId, verticalId: input.verticalId }, context);
  return toMatterRecord(created);
}

async function storeLoadMatter(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<WorkflowMatterSnapshot | null> {
  try {
    const [matter, documents] = await Promise.all([
      loadCase(matterId, context),
      listCaseDocuments(matterId, context),
    ]);
    return { matter: toMatterRecord(matter), documents: documents.map(toMatterDocument) };
  } catch (error) {
    if (error instanceof CaseNotFoundError) return null;
    throw error;
  }
}

async function storeReplaceDocuments(
  matterId: string,
  desired: readonly WorkflowMatterDocument[],
  context: AuthenticatedUserContext,
): Promise<WorkflowMatterDocument[]> {
  const current = await listCaseDocuments(matterId, context);
  const currentByDoc = new Map(current.map((row) => [row.document_id, row]));
  const desiredByDoc = new Map(desired.map((row) => [row.documentId, row]));

  for (const existing of current) {
    if (!desiredByDoc.has(existing.document_id)) {
      await detachDocument({ caseId: matterId, documentId: existing.document_id }, context);
    }
  }

  for (const wanted of desired) {
    if (!currentByDoc.has(wanted.documentId)) {
      await attachDocument(
        {
          caseId: matterId,
          documentId: wanted.documentId,
          role: wanted.role,
          evidenceKind: wanted.evidenceKind as EvidenceKind | null,
          position: wanted.position,
        },
        context,
      );
    }
  }

  for (const wanted of desired) {
    const existing = currentByDoc.get(wanted.documentId);
    if (!existing) continue;
    if (existing.included !== wanted.included) {
      await setDocumentIncluded(
        { caseId: matterId, documentId: wanted.documentId, included: wanted.included },
        context,
      );
    }
    if (existing.position !== wanted.position) {
      await reorderDocument(
        { caseId: matterId, documentId: wanted.documentId, position: wanted.position },
        context,
      );
    }
  }

  const fresh = await listCaseDocuments(matterId, context);
  return fresh.map(toMatterDocument);
}

async function storeSaveAnalysis(
  matterId: string,
  analysis: WorkflowMatterAnalysis,
  context: AuthenticatedUserContext,
): Promise<void> {
  await persistCaseAnalysis(
    matterId,
    analysis.documentId,
    analysis.model,
    analysis.result as unknown as NoticeAnalysis,
    context,
  );
}

async function storeLoadAnalysis(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<WorkflowMatterAnalysis | null> {
  const stored = await loadLatestAnalysis(matterId, context);
  if (!stored) return null;
  return {
    version: stored.version,
    documentId: stored.documentId,
    model: stored.model,
    createdAt: stored.createdAt,
    result: stored.result,
  };
}

async function storeSaveInput(
  matterId: string,
  input: Record<string, unknown>,
  context: AuthenticatedUserContext,
): Promise<WorkflowRuntimeStoredInput> {
  await loadCase(matterId, context);

  const { data: latest, error: latestError } = await context.supabase
    .from("workflow_case_inputs")
    .select("version")
    .eq("case_id", matterId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error("Unable to read the existing workflow information");

  const version = (latest?.version ?? 0) + 1;
  const { data, error } = await context.supabase
    .from("workflow_case_inputs")
    .insert({ case_id: matterId, owner_id: context.user.id, version, input: input as never })
    .select("version, input, created_at")
    .single();
  if (error || !data) throw new Error("Unable to save workflow information");

  return { version: data.version, input: data.input as Record<string, unknown>, createdAt: data.created_at };
}

async function storeLoadInput(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<WorkflowRuntimeStoredInput | null> {
  const { data, error } = await context.supabase
    .from("workflow_case_inputs")
    .select("version, input, created_at")
    .eq("case_id", matterId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { version: data.version, input: data.input as Record<string, unknown>, createdAt: data.created_at };
}

async function storeSaveDraft(
  matterId: string,
  input: { bodyText: string; basis: WorkflowDraftBasis },
  context: AuthenticatedUserContext,
): Promise<WorkflowRuntimeStoredDraft> {
  const saved = await saveCaseDraft(matterId, input.bodyText, input.basis, context);
  return {
    version: saved.version,
    bodyText: saved.bodyText,
    createdAt: saved.createdAt,
    basis: (saved.basis ?? undefined) as WorkflowDraftBasis | undefined,
  };
}

async function storeLoadDraft(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<WorkflowRuntimeStoredDraft | null> {
  const draft = await loadLatestCaseDraft(matterId, context);
  if (!draft) return null;
  return {
    version: draft.version,
    bodyText: draft.bodyText,
    createdAt: draft.createdAt,
    basis: (draft.basis ?? undefined) as WorkflowDraftBasis | undefined,
  };
}

async function storeSaveApproval(
  matterId: string,
  approval: ExactPacketApproval,
  context: AuthenticatedUserContext,
): Promise<void> {
  await approvePacket(
    {
      caseId: matterId,
      recipient: approval.recipient,
      mailClass: approval.mailClass,
      reviewed: { packetSha256: approval.packetSha256, totalCents: approval.totalCents },
      approvalId: approval.approvalId,
    },
    context,
  );
}

async function storeLoadApproval(
  matterId: string,
  context: AuthenticatedUserContext,
): Promise<ExactPacketApproval | null> {
  const { data, error } = await context.supabase
    .from("case_approvals")
    .select("id, packet_sha256, recipient, mail_class, quote, approved_at")
    .eq("case_id", matterId)
    .eq("owner_id", context.user.id)
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const matter = await loadCase(matterId, context);
  const quote = data.quote as { totalCents: number };
  return {
    approvalId: data.id,
    matterId,
    workflowId: matter.workflow_id,
    packetSha256: data.packet_sha256,
    totalCents: quote.totalCents,
    recipient: data.recipient as WorkflowMailingAddress,
    mailClass: data.mail_class as ExactPacketApproval["mailClass"],
    approvedBy: context.user.id,
    approvedAt: data.approved_at,
  };
}

async function documentsUpload(
  input: { workflowId: string; purpose: string; consent: boolean; file: File },
  context: AuthenticatedUserContext,
) {
  const registered = await intakeSecureDocument(
    { file: input.file, workflowId: input.workflowId, purpose: input.purpose, consent: input.consent },
    context,
  );
  return {
    id: registered.id,
    filename: registered.safe_filename,
    sizeBytes: registered.size_bytes,
    securityStatus: registered.security_status,
  };
}

async function documentsDescribe(documentId: string, context: AuthenticatedUserContext) {
  const { data, error } = await context.supabase
    .from("secure_documents")
    .select("safe_filename, mime_type, size_bytes, security_status, deleted_at, deletion_requested_at")
    .eq("id", documentId)
    .eq("owner_id", context.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Document not found");

  const usable = data.security_status === "clean" && !data.deleted_at && !data.deletion_requested_at;
  return {
    filename: data.safe_filename as string,
    mimeType: (data.mime_type ?? null) as string | null,
    sizeBytes: (data.size_bytes ?? null) as number | null,
    pageCount: null,
    securityStatus: data.security_status as string,
    usable,
  };
}

async function intelligenceAnalyze(matterId: string, context: AuthenticatedUserContext) {
  const { documentId, model, result } = await runNoticeAnalysisModel(matterId, context);
  return { documentId, model, result };
}

async function intelligenceGenerateDraft(matterId: string, context: AuthenticatedUserContext) {
  const generated = await generateDraftResponse(matterId, context);
  return {
    bodyText: generated.bodyText,
    model: generated.model,
    ...(generated.validation ? { validation: generated.validation } : {}),
    ...(generated.strategy ? { strategy: generated.strategy } : {}),
  };
}

async function packetPreview(
  matterId: string,
  mailClass: "standard" | "certified" | "registered",
  context: AuthenticatedUserContext,
): Promise<WorkflowPacketPreview> {
  const preview = await previewPacket(matterId, mailClass, context);
  return {
    packetSha256: preview.packetSha256,
    responsePages: preview.responsePages,
    supportingPages: preview.supportingPages,
    manifest: preview.manifest,
    quote: { ...preview.quote },
  };
}

async function checkoutMatter(
  input: { matterId: string; approval: ExactPacketApproval; sender: WorkflowMailingAddress },
  context: AuthenticatedUserContext,
) {
  if (!context.user.email) {
    throw new WorkflowRuntimeError(
      "A verified account email is required for payment receipts.",
      "CHECKOUT_EMAIL_REQUIRED",
    );
  }

  const packet = await materializeApprovedPacket(input.matterId, input.approval.approvalId, context);
  const order = await createOrLoadOrder({
    caseId: input.matterId,
    approvalId: input.approval.approvalId,
    sender: assertRecipient(input.sender),
    userId: context.user.id,
    email: context.user.email,
    packet,
  });
  const checkout = await ensureCheckoutSession({
    order,
    approvalId: input.approval.approvalId,
    caseId: input.matterId,
    workflowId: packet.workflowId,
    email: context.user.email,
  });

  if (!checkout.checkoutUrl) {
    throw new WorkflowRuntimeError(
      "Checkout is unavailable for this order; it may already be paid.",
      "CHECKOUT_UNAVAILABLE",
    );
  }

  return {
    checkoutUrl: checkout.checkoutUrl,
    orderId: order.id,
    packetSha256: packet.packetSha256,
    totalCents: packet.quote.totalCents,
  };
}

/**
 * Builds and runs a request-scoped handler. A fresh dependency object (and a
 * fresh `context` closure variable) is created for every call so one user's
 * authenticated Supabase client is never reused for a different, concurrent
 * request — the same isolation property request-scoped middleware would give,
 * without depending on AsyncLocalStorage support in the deploy target.
 */
export async function handleWorkflowRuntimeRequest(request: Request): Promise<Response> {
  let currentContext: AuthenticatedUserContext | null = null;

  function requireContext(): AuthenticatedUserContext {
    if (!currentContext) {
      throw new Error("Workflow runtime dependency invoked before authentication");
    }
    return currentContext;
  }

  const handler = createPlatformWorkflowRuntimeRequestHandler({
    async authenticate(req) {
      try {
        currentContext = await requireAuthenticatedUser(req);
        return { id: currentContext.user.id, scopes: [] };
      } catch (error) {
        if (error instanceof AuthenticationError) return null;
        throw error;
      }
    },

    store: {
      createMatter: (input) => storeCreateMatter(input, requireContext()),
      loadMatter: (_ownerId, matterId) => storeLoadMatter(matterId, requireContext()),
      replaceDocuments: (_ownerId, matterId, documents) =>
        storeReplaceDocuments(matterId, documents, requireContext()),
      saveAnalysis: (_ownerId, matterId, analysis) => storeSaveAnalysis(matterId, analysis, requireContext()),
      loadAnalysis: (_ownerId, matterId) => storeLoadAnalysis(matterId, requireContext()),
      saveInput: (_ownerId, matterId, input) => storeSaveInput(matterId, input, requireContext()),
      loadInput: (_ownerId, matterId) => storeLoadInput(matterId, requireContext()),
      saveDraft: (_ownerId, matterId, input) => storeSaveDraft(matterId, input, requireContext()),
      loadDraft: (_ownerId, matterId) => storeLoadDraft(matterId, requireContext()),
      saveApproval: (_ownerId, matterId, approval) => storeSaveApproval(matterId, approval, requireContext()),
      loadApproval: (_ownerId, matterId) => storeLoadApproval(matterId, requireContext()),
    },

    documents: {
      upload: (input) => documentsUpload(input, requireContext()),
      describe: (input) => documentsDescribe(input.documentId, requireContext()),
    },

    intelligence: {
      analyze: (input) => intelligenceAnalyze(input.matter.matter.id, requireContext()),
      generateDraft: (input) => intelligenceGenerateDraft(input.matter.matter.id, requireContext()),
    },

    packet: {
      preview: (input) => packetPreview(input.matter.matter.id, input.mailClass, requireContext()),
    },

    checkout: {
      checkout: (input) =>
        checkoutMatter(
          { matterId: input.matter.matter.id, approval: input.approval, sender: input.sender },
          requireContext(),
        ),
    },
  });

  return handler(request);
}
