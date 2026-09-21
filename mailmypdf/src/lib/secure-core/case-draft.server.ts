// Draft persistence for the generic workflow-runtime host.
//
// Mirrors the immutable, versioned insert the v2 /cases/:id/draft route
// performs directly, but also carries the generic runtime's "draft basis"
// fingerprint (see @mailmypdf/workflows' draft-basis.ts) so a draft saved
// against stale analysis/input/documents can be detected before it reaches a
// packet. The v2 route's own drafts (basis: null) remain valid; freshness is
// only enforced for callers that supply a basis.

import type { AuthenticatedUserContext } from "./auth.server";
import { CaseError, loadCase } from "./case.server";

export interface StoredCaseDraft {
  version: number;
  bodyText: string;
  createdAt: string;
  basis: unknown | null;
}

const MAX_DRAFT_CHARS = 100_000;

export async function saveCaseDraft(
  caseId: string,
  bodyText: string,
  basis: unknown,
  context: AuthenticatedUserContext,
): Promise<StoredCaseDraft> {
  const text = bodyText.trim();
  if (!text) throw new CaseError("A draft response is required");
  if (text.length > MAX_DRAFT_CHARS) throw new CaseError("The draft response is too long");

  await loadCase(caseId, context);

  const { data: latest, error: latestError } = await context.supabase
    .from("case_drafts")
    .select("version")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new CaseError("Unable to read the existing draft history");

  const version = (latest?.version ?? 0) + 1;
  const { data, error } = await context.supabase
    .from("case_drafts")
    .insert({
      case_id: caseId,
      owner_id: context.user.id,
      version,
      body_text: text,
      basis: basis as never,
    })
    .select("version, body_text, created_at, basis")
    .single();
  if (error || !data) throw new CaseError("Unable to save the draft response");

  await context.supabase
    .from("workflow_cases")
    .update({ status: "drafted" })
    .eq("id", caseId)
    .eq("owner_id", context.user.id);

  return {
    version: data.version,
    bodyText: data.body_text,
    createdAt: data.created_at,
    basis: data.basis ?? null,
  };
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
    basis: data.basis ?? null,
  };
}
