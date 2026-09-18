// Adapter binding the shared @mailmypdf/workflows matter-runtime host
// contract onto this app's existing secure-core case implementation.
//
// Scope of this first milestone (CP14 only): auth, matter create/load,
// document replace/upload/describe, analysis, workflow input, draft
// (including draft-basis persistence), and packet preview. Approval and
// checkout are intentionally NOT implemented here yet — see
// `notImplementedApprovalGateway`/`notImplementedCheckoutGateway` below for
// why, rather than weakening the exact-packet-approval invariant to make
// something appear to work.
//
// Row-level security remains the authorization boundary: every secure-core
// call below runs through a real `AuthenticatedUserContext` (a user-scoped
// Supabase client), never a service-role key.

import type {
  WorkflowRuntimeActor,
  WorkflowRuntimeCheckoutGateway,
  WorkflowRuntimeDocumentGateway,
  WorkflowRuntimeIntelligenceGateway,
  WorkflowRuntimePacketGateway,
  WorkflowRuntimeServerDependencies,
  WorkflowRuntimeStore,
  WorkflowRuntimeStoredInput,
} from "@mailmypdf/workflows";
import { WorkflowRuntimeError } from "@mailmypdf/workflows";
import { AuthenticationError, requireAuthenticatedUser, type AuthenticatedUserContext } from "./auth.server";
import {
  CaseNotFoundError,
  attachDocument,
  createCase,
  detachDocument,
  listCaseDocuments,
  loadCase,
  reorderDocument,
  setDocumentIncluded,
  type CaseDocument,
  type DocumentRole,
  type EvidenceKind,
  type WorkflowCase,
} from "./case.server";
import { analyseSubjectNotice, generateDraftResponse, loadLatestAnalysis } from "./case-analysis.server";
import { loadLatestCaseDraft, saveCaseDraft } from "./case-draft.server";
import { loadLatestCaseInput, saveCaseInput } from "./case-inputs.server";
import { previewPacket } from "./case-approval.server";
import { describeSecureDocument, intakeSecureDocument } from "./document-intake.server";

/**
 * The platform's WorkflowRuntimeActor only carries {id, scopes}, but every
 * secure-core function needs a full row-level-security-scoped Supabase
 * client to run. `authenticate()` attaches the real context to the actor it
 * returns; gateways that receive `actor` read it back from here. Store
 * methods only receive an `ownerId` string, so they instead look it up from
 * `contextByOwnerId`, populated by the same `authenticate()` call for this
 * request. Because correctness under RLS depends only on the authenticated
 * user's identity (not which specific request produced the client), reusing
 * the most recently authenticated context for a given owner id across
 * concurrent requests from that same user is safe.
 */
interface HostActor extends WorkflowRuntimeActor {
  readonly context: AuthenticatedUserContext;
}

const contextByOwnerId = new Map<string, AuthenticatedUserContext>();

function contextOf(actor: WorkflowRuntimeActor): AuthenticatedUserContext {
  const context = (actor as Partial<HostActor>).context;
  if (!context) throw new Error("Workflow runtime actor is missing its authenticated context");
  return context;
}

function requireOwnerContext(ownerId: string): AuthenticatedUserContext {
  const context = contextByOwnerId.get(ownerId);
  if (!context) throw new Error("No authenticated context is available for this owner");
  return context;
}

async function authenticate(request: Request): Promise<WorkflowRuntimeActor | null> {
  try {
    const context = await requireAuthenticatedUser(request);
    contextByOwnerId.set(context.user.id, context);
    const actor: HostActor = { id: context.user.id, scopes: [], context };
    return actor;
  } catch (error) {
    if (error instanceof AuthenticationError) return null;
    throw error;
  }
}

function toMatterRecord(workflowCase: WorkflowCase) {
  return {
    id: workflowCase.id,
    workflowId: workflowCase.workflow_id,
    verticalId: workflowCase.vertical_id,
    status: workflowCase.status,
    createdAt: workflowCase.created_at,
    updatedAt: workflowCase.updated_at,
  };
}

function toMatterDocument(document: CaseDocument) {
  return {
    id: document.id,
    documentId: document.document_id,
    role: document.role,
    evidenceKind: document.evidence_kind,
    pageCount: document.page_count,
    included: document.included,
    position: document.position,
    filename: document.filename,
    mimeType: document.mime_type,
    sizeBytes: document.size_bytes,
    securityStatus: document.security_status,
    usable: document.usable,
  };
}

/**
 * Reconciles the desired document set the runtime host computed against
 * what secure-core actually has attached to this case, since secure-core
 * exposes attach/setIncluded/reorder/detach as separate operations rather
 * than a single bulk replace.
 */
async function replaceDocuments(
  ownerId: string,
  matterId: string,
  documents: readonly {
    documentId: string;
    role: DocumentRole;
    evidenceKind: string | null;
    included: boolean;
    position: number;
  }[],
) {
  const context = requireOwnerContext(ownerId);
  const current = await listCaseDocuments(matterId, context);
  const currentById = new Map(current.map((doc) => [doc.document_id, doc]));
  const desiredIds = new Set(documents.map((doc) => doc.documentId));

  for (const existing of current) {
    if (!desiredIds.has(existing.document_id)) {
      await detachDocument({ caseId: matterId, documentId: existing.document_id }, context);
    }
  }

  for (const desired of documents) {
    const existing = currentById.get(desired.documentId);
    if (!existing) {
      await attachDocument(
        {
          caseId: matterId,
          documentId: desired.documentId,
          role: desired.role,
          evidenceKind: desired.evidenceKind as EvidenceKind | null,
          position: desired.position,
        },
        context,
      );
      continue;
    }
    if (existing.included !== desired.included) {
      await setDocumentIncluded({ caseId: matterId, documentId: desired.documentId, included: desired.included }, context);
    }
    if (existing.position !== desired.position) {
      await reorderDocument({ caseId: matterId, documentId: desired.documentId, position: desired.position }, context);
    }
  }

  return (await listCaseDocuments(matterId, context)).map(toMatterDocument);
}

const store: WorkflowRuntimeStore = {
  async createMatter(input) {
    const context = requireOwnerContext(input.ownerId);
    const workflowCase = await createCase({ workflowId: input.workflowId, verticalId: input.verticalId }, context);
    return toMatterRecord(workflowCase);
  },

  async loadMatter(ownerId, matterId) {
    const context = requireOwnerContext(ownerId);
    try {
      const workflowCase = await loadCase(matterId, context);
      const documents = await listCaseDocuments(matterId, context);
      return { matter: toMatterRecord(workflowCase), documents: documents.map(toMatterDocument) };
    } catch (error) {
      if (error instanceof CaseNotFoundError) return null;
      throw error;
    }
  },

  replaceDocuments,

  async saveAnalysis() {
    // `intelligence.analyze` below (backed by `analyseSubjectNotice`) already
    // persists the analysis via the `record_case_analysis` RPC as part of
    // producing its result, including assigning the authoritative version.
    // Writing again here would either duplicate that row or race its own
    // version numbering. Deliberately a no-op rather than a second write.
  },
  async loadAnalysis(ownerId, matterId) {
    const context = requireOwnerContext(ownerId);
    const analysis = await loadLatestAnalysis(matterId, context);
    if (!analysis) return null;
    return {
      version: analysis.version,
      documentId: analysis.documentId,
      model: analysis.model,
      createdAt: analysis.createdAt,
      result: analysis.result,
    };
  },

  async saveInput(ownerId, matterId, input) {
    const context = requireOwnerContext(ownerId);
    const version = await saveCaseInput(matterId, input, context);
    return { version, input, createdAt: new Date().toISOString() };
  },
  async loadInput(ownerId, matterId): Promise<WorkflowRuntimeStoredInput | null> {
    const context = requireOwnerContext(ownerId);
    const stored = await loadLatestCaseInput(matterId, context);
    if (!stored) return null;
    // secure-core does not currently record a per-version timestamp for
    // workflow input; the input's own record does not depend on it (only
    // draft-basis freshness does, which compares the version number).
    return { version: stored.version, input: stored.input, createdAt: new Date(0).toISOString() };
  },

  async saveDraft(ownerId, matterId, input) {
    const context = requireOwnerContext(ownerId);
    const { version } = await saveCaseDraft(matterId, { bodyText: input.bodyText, basis: input.basis }, context);
    return { version, bodyText: input.bodyText, createdAt: new Date().toISOString(), basis: input.basis };
  },
  async loadDraft(ownerId, matterId) {
    const context = requireOwnerContext(ownerId);
    const draft = await loadLatestCaseDraft(matterId, context);
    if (!draft) return null;
    return { version: draft.version, bodyText: draft.bodyText, createdAt: draft.createdAt, basis: draft.basis ?? undefined };
  },

  async saveApproval() {
    throw new WorkflowRuntimeError(
      "Exact-packet approval is not yet implemented on this host: the current secure-core " +
        "approval persistence (`case_approvals` / `approve_case_packet`) does not accept the " +
        "platform's already-computed exact-packet approval, and this milestone will not bypass " +
        "that gate or invent the missing manifest/page-count data to force a fit.",
      "NOT_IMPLEMENTED",
    );
  },
  async loadApproval() {
    return null;
  },
};

const documents: WorkflowRuntimeDocumentGateway = {
  async upload(input) {
    const context = contextOf(input.actor);
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
  },
  async describe(input) {
    const context = contextOf(input.actor);
    return describeSecureDocument(input.documentId, context);
  },
};

const intelligence: WorkflowRuntimeIntelligenceGateway = {
  async analyze(input) {
    const context = contextOf(input.actor);
    const analysis = await analyseSubjectNotice(input.matter.matter.id, context);
    return {
      documentId: analysis.documentId,
      model: analysis.model,
      result: analysis.result,
    };
  },
  async generateDraft(input) {
    const context = contextOf(input.actor);
    // generateDraftResponse re-derives the current analysis/input from the
    // matter id itself; the analysis/caseInput already loaded by the runtime
    // host are not re-passed in, since secure-core has no variant that
    // accepts them directly without also re-deriving its own workflow rules.
    const generated = await generateDraftResponse(input.matter.matter.id, context);
    return { bodyText: generated.bodyText, model: generated.model };
  },
};

const packet: WorkflowRuntimePacketGateway = {
  async preview(input) {
    const context = contextOf(input.actor);
    return previewPacket(input.matter.matter.id, input.mailClass, context);
  },
};

const checkout: WorkflowRuntimeCheckoutGateway = {
  async checkout() {
    throw new WorkflowRuntimeError(
      "Checkout is not yet implemented on this host: it depends on an approved packet being " +
        "persisted in the shape `materializeApprovedPacket` requires, which is not yet true " +
        "(see saveApproval). This milestone will not bypass `approve_case_packet` or fabricate " +
        "an order.",
      "NOT_IMPLEMENTED",
    );
  },
};

export function createWorkflowRuntimeHostDependencies(): WorkflowRuntimeServerDependencies {
  return {
    authenticate,
    store,
    documents,
    intelligence,
    packet,
    checkout,
  };
}
