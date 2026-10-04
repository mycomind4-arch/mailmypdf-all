import type { CaseGoal } from "@mailmypdf/agent-runtime";
import type { AuthenticatedUserContext } from "@/lib/secure-core/auth.server";
import { RecoveryCaseError } from "./recovery-case-service";

/** Display labels only. Storage paths and provider credentials never reach the app. */
export async function describeRecoveryCaseEvidence(
  context: AuthenticatedUserContext,
  goal: CaseGoal,
) {
  if (goal.ownerId !== context.user.id)
    throw new RecoveryCaseError(403, "Recovery evidence owner authorization denied.");
  const ids = [...new Set(goal.evidenceIds)];
  if (!ids.length) return [];
  if (ids.length > 1000) throw new RecoveryCaseError(400, "Too many linked evidence records.");
  const { data, error } = await context.supabase
    .from("secure_documents")
    .select(
      "id,owner_id,safe_filename,original_filename,security_status,deleted_at,deletion_requested_at",
    )
    .eq("owner_id", context.user.id)
    .in("id", ids)
    .limit(1000);
  if (
    error ||
    !data ||
    data.some((row) => row.owner_id !== context.user.id || !ids.includes(row.id))
  ) {
    throw new RecoveryCaseError(503, "Recovery evidence is unavailable. Reload before continuing.");
  }
  const rows = new Map(data.map((row) => [row.id, row]));
  return ids.map((id) => {
    const row = rows.get(id);
    if (!row || row.deleted_at || row.deletion_requested_at)
      return { id, name: "Document unavailable", securityStatus: "unavailable", available: false };
    const name =
      typeof row.safe_filename === "string" && row.safe_filename.trim()
        ? row.safe_filename
        : typeof row.original_filename === "string" && row.original_filename.trim()
          ? row.original_filename
          : "Stored document";
    return {
      id,
      name: name.slice(0, 512),
      securityStatus: String(row.security_status).slice(0, 100),
      available: row.security_status === "clean",
    };
  });
}
