import { timingSafeEqual } from "node:crypto";

const BUCKET = "secure-documents";
const DEFAULT_BATCH_SIZE = 50;

type ClaimedDocument = {
  id: string;
  owner_id: string;
  storage_path: string;
  deletion_attempts: number;
};

function retentionSecret(): string {
  const value = process.env.MAILMYPDF_RETENTION_JOB_SECRET;
  if (!value || value.length < 32) {
    throw new Error("MAILMYPDF_RETENTION_JOB_SECRET must contain at least 32 characters");
  }
  return value;
}

function equalSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function requireRetentionAuthorization(request: Request): void {
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !equalSecret(supplied, retentionSecret())) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export async function purgeExpiredSecureDocuments(batchSize = DEFAULT_BATCH_SIZE) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("Retention batch size must be between 1 and 100");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;
  const { data, error } = await admin.rpc("claim_secure_documents_for_deletion", {
    batch_limit: batchSize,
  });
  if (error) throw new Error(`Could not claim expired documents: ${error.message}`);

  const result = { claimed: data?.length ?? 0, deleted: 0, failed: 0 };
  for (const document of (data ?? []) as ClaimedDocument[]) {
    const { error: storageError } = await admin.storage.from(BUCKET).remove([document.storage_path]);
    if (storageError) {
      result.failed += 1;
      await admin
        .from("secure_documents")
        .update({ last_deletion_error: storageError.message.slice(0, 500) })
        .eq("id", document.id)
        .eq("security_status", "deleting");
      continue;
    }

    const deletedAt = new Date().toISOString();
    const { error: tombstoneError } = await admin
      .from("secure_documents")
      .update({
        security_status: "deleted",
        deleted_at: deletedAt,
        original_filename: null,
        safe_filename: null,
        storage_path: `${document.owner_id}/deleted/${document.id}`,
        mime_type: null,
        size_bytes: null,
        sha256: null,
        scanner_name: null,
        scanner_result: null,
        scanned_at: null,
        last_scan_error: null,
        last_deletion_error: null,
      })
      .eq("id", document.id)
      .eq("security_status", "deleting");
    if (tombstoneError) {
      result.failed += 1;
      continue;
    }
    result.deleted += 1;
  }
  return result;
}
