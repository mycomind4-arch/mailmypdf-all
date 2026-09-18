// Immutable draft response versions for a case.
//
// Extracted from the formerly-inline /api/v2/cases/$id/draft.ts route so the
// same persistence can back both that route and the shared workflow-runtime
// host. Every operation runs through the user-scoped client, so row-level
// security remains the authorization boundary.

import type { AuthenticatedUserContext } from "./auth.server";
import { CaseError, loadCase, setCaseStatus } from "./case.server";

const MAX_DRAFT_CHARS = 100_000;

/**
 * Structurally identical to @mailmypdf/workflows' WorkflowDraftBasis. Kept as
 * a local shape (not an import) because this app does not otherwise depend
 * on that package; the workflow-runtime host adapter is responsible for any
 * conversion between the two names.
 */
export interface CaseDraftBasis {
  analysisVersion: number;
  analysisDocumentId: string;
  inputVersion: number;
  documentsFingerprint: string;
}

export interface StoredCaseDraft {
  version: number;
  bodyText: string;
  createdAt: string;
  /** Null for drafts saved before draft-basis tracking existed. */
  basis: CaseDraftBasis | null;
}

export async function loadLatestCaseDraft(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<StoredCaseDraft | null> {
  const { data, error } = await context.supabase
    .from("case_drafts")
    .select("version, body_text, created_at, basis")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new CaseError(error.message);
  if (!data) return null;
  return {
    version: data.version,
    bodyText: data.body_text,
    createdAt: data.created_at,
    basis: (data.basis ?? null) as CaseDraftBasis | null,
  };
}

/**
 * Saves a new immutable draft version. Editing history is preserved so an
 * approval can be traced back to the exact text that was approved.
 */
export async function saveCaseDraft(
  caseId: string,
  input: { bodyText: string; basis?: CaseDraftBasis | null },
  context: AuthenticatedUserContext,
): Promise<{ version: number }> {
  const text = input.bodyText.trim();
  if (!text) throw new CaseError("A draft response is required");
  if (text.length > MAX_DRAFT_CHARS) throw new CaseError("The draft response is too long");

  await loadCase(caseId, context);

  const { data: latest } = await context.supabase
    .from("case_drafts")
    .select("version")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;
  const { error } = await context.supabase.from("case_drafts").insert({
    case_id: caseId,
    owner_id: context.user.id,
    version,
    body_text: text,
    basis: input.basis ?? null,
  });
  if (error) throw new CaseError("Unable to save the draft response");

  await setCaseStatus(caseId, "drafted", context);
  return { version };
}
