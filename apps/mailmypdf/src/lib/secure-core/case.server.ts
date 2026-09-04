// Workflow cases: the matter a user is responding to, the evidence they chose
// to enclose, and the packet they approved.
//
// Every operation runs through the user-scoped client, so row-level security —
// not this module — is the authorization boundary. Nothing here accepts a
// service-role key.

import type { AuthenticatedUserContext } from "./auth.server";

export type CaseStatus =
  | "intake" | "analyzed" | "evidence" | "drafted" | "approved" | "submitted" | "abandoned";

export type DocumentRole = "subject_notice" | "evidence";

export const EVIDENCE_KINDS = [
  "medical_records",
  "physician_statement",
  "test_results",
  "medication_history",
  "functional_capacity",
  "work_history",
  "prior_decision",
  "correspondence",
  "other",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export class CaseError extends Error {}
export class CaseNotFoundError extends CaseError {}

export interface WorkflowCase {
  id: string;
  workflow_id: string;
  vertical_id: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface CaseDocument {
  id: string;
  document_id: string;
  role: DocumentRole;
  evidence_kind: EvidenceKind | null;
  page_count: number | null;
  included: boolean;
  position: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  security_status: string;
  /** True once malware scanning has released the document for use. */
  usable: boolean;
}

export async function createCase(
  input: { workflowId: string; verticalId: string },
  context: AuthenticatedUserContext,
): Promise<WorkflowCase> {
  const { data, error } = await context.supabase
    .from("workflow_cases")
    .insert({
      owner_id: context.user.id,
      workflow_id: input.workflowId,
      vertical_id: input.verticalId,
    })
    .select("id, workflow_id, vertical_id, status, created_at, updated_at")
    .single();
  if (error || !data) throw new CaseError("Unable to open a case");
  return data as WorkflowCase;
}

export async function loadCase(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<WorkflowCase> {
  const { data, error } = await context.supabase
    .from("workflow_cases")
    .select("id, workflow_id, vertical_id, status, created_at, updated_at")
    .eq("id", caseId)
    .eq("owner_id", context.user.id)
    .maybeSingle();
  if (error) throw new CaseError(error.message);
  if (!data) throw new CaseNotFoundError("Case not found");
  return data as WorkflowCase;
}

export async function listCaseDocuments(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<CaseDocument[]> {
  const { data: attachments, error } = await context.supabase
    .from("case_documents")
    .select("id, document_id, role, evidence_kind, page_count, included, position")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("position", { ascending: true });
  if (error) throw new CaseError(error.message);
  if (!attachments?.length) return [];

  const { data: documents, error: documentError } = await context.supabase
    .from("secure_documents")
    .select("id, safe_filename, mime_type, size_bytes, security_status, deleted_at, deletion_requested_at")
    .in("id", attachments.map((row) => row.document_id))
    .eq("owner_id", context.user.id);
  if (documentError) throw new CaseError(documentError.message);

  const byId = new Map((documents ?? []).map((row) => [row.id, row]));

  return attachments.map((row) => {
    const document = byId.get(row.document_id);
    const status = document?.security_status ?? "unknown";
    return {
      id: row.id,
      document_id: row.document_id,
      role: row.role as DocumentRole,
      evidence_kind: (row.evidence_kind ?? null) as EvidenceKind | null,
      page_count: row.page_count,
      included: row.included,
      position: row.position,
      filename: document?.safe_filename ?? "",
      mime_type: document?.mime_type ?? null,
      size_bytes: document?.size_bytes ?? null,
      security_status: status,
      usable: status === "clean" && !document?.deleted_at && !document?.deletion_requested_at,
    };
  });
}

/**
 * Attaches an already-quarantined document to a case. The document does not
 * have to be clean yet — a user should be able to assemble their evidence
 * while scanning runs — but the packet gate refuses to build anything that
 * still contains unscanned content.
 */
export async function attachDocument(
  input: {
    caseId: string;
    documentId: string;
    role: DocumentRole;
    evidenceKind?: EvidenceKind | null;
    position?: number;
  },
  context: AuthenticatedUserContext,
): Promise<void> {
  if (input.role === "evidence" && !input.evidenceKind) {
    throw new CaseError("Supporting evidence must declare what kind of document it is");
  }
  if (input.evidenceKind && !EVIDENCE_KINDS.includes(input.evidenceKind)) {
    throw new CaseError("Unrecognized evidence kind");
  }

  const { error } = await context.supabase.from("case_documents").insert({
    case_id: input.caseId,
    document_id: input.documentId,
    owner_id: context.user.id,
    role: input.role,
    evidence_kind: input.role === "evidence" ? input.evidenceKind : null,
    position: input.position ?? 0,
  });

  if (error) {
    // 23505 unique_violation, 23514 check_violation, 42501 RLS refusal.
    if (error.code === "23505") throw new CaseError("That document is already attached to this case");
    if (error.code === "23514") throw new CaseError("That document cannot be attached in this role");
    throw new CaseError("Unable to attach the document to this case");
  }
}

/** Include or exclude an attachment from the mailed packet. */
export async function setDocumentIncluded(
  input: { caseId: string; documentId: string; included: boolean },
  context: AuthenticatedUserContext,
): Promise<void> {
  const { error, count } = await context.supabase
    .from("case_documents")
    .update({ included: input.included }, { count: "exact" })
    .eq("case_id", input.caseId)
    .eq("document_id", input.documentId)
    .eq("owner_id", context.user.id);
  if (error) throw new CaseError(error.message);
  if (!count) throw new CaseNotFoundError("Document not found on this case");
}

export async function reorderDocument(
  input: { caseId: string; documentId: string; position: number },
  context: AuthenticatedUserContext,
): Promise<void> {
  if (!Number.isInteger(input.position) || input.position < 0 || input.position > 500) {
    throw new CaseError("Invalid position");
  }
  const { error, count } = await context.supabase
    .from("case_documents")
    .update({ position: input.position }, { count: "exact" })
    .eq("case_id", input.caseId)
    .eq("document_id", input.documentId)
    .eq("owner_id", context.user.id);
  if (error) throw new CaseError(error.message);
  if (!count) throw new CaseNotFoundError("Document not found on this case");
}

/**
 * Removes a document from the case. The document itself stays in the vault
 * under its own retention clock; deleting the file is a separate, audited
 * request against /api/v2/documents/:id.
 */
export async function detachDocument(
  input: { caseId: string; documentId: string },
  context: AuthenticatedUserContext,
): Promise<void> {
  const { error, count } = await context.supabase
    .from("case_documents")
    .delete({ count: "exact" })
    .eq("case_id", input.caseId)
    .eq("document_id", input.documentId)
    .eq("owner_id", context.user.id);
  if (error) throw new CaseError(error.message);
  if (!count) throw new CaseNotFoundError("Document not found on this case");
}

export async function setCaseStatus(
  caseId: string,
  status: CaseStatus,
  context: AuthenticatedUserContext,
): Promise<void> {
  const { error } = await context.supabase
    .from("workflow_cases")
    .update({ status })
    .eq("id", caseId)
    .eq("owner_id", context.user.id);
  if (error) throw new CaseError(error.message);
}
