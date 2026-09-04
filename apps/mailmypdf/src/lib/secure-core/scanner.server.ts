import { timingSafeEqual } from "node:crypto";
import { computeSha256 } from "@mailmypdf/documents";

const BUCKET = "secure-documents";
const DEFAULT_BATCH_SIZE = 10;
const MAX_SCAN_RESPONSE_BYTES = 16_384;

type ClaimedDocument = {
  id: string;
  owner_id: string;
  storage_path: string;
  mime_type: string;
  sha256: string;
  scan_attempts: number;
  deletion_requested_at: string | null;
};

type ScannerVerdict = {
  status: "clean" | "infected";
  engine: string;
  signature?: string;
  definitionsVersion?: string;
};

function configuredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}

function equalSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function requireScannerAuthorization(request: Request): void {
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !equalSecret(supplied, configuredSecret("MAILMYPDF_SCANNER_JOB_SECRET"))) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function scannerUrl(): URL {
  const configured = process.env.MAILMYPDF_MALWARE_SCANNER_URL;
  if (!configured) throw new Error("MAILMYPDF_MALWARE_SCANNER_URL is not configured");
  const url = new URL(configured);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "127.0.0.1")) {
    throw new Error("Malware scanner must use HTTPS");
  }
  return url;
}

async function scan(content: Uint8Array, mimeType: string): Promise<ScannerVerdict> {
  const response = await fetch(scannerUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuredSecret("MAILMYPDF_MALWARE_SCANNER_KEY")}`,
      "Content-Type": mimeType,
      "X-Content-SHA256": computeSha256(content),
    },
    body: content,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Scanner returned HTTP ${response.status}`);
  const responseText = await response.text();
  if (Buffer.byteLength(responseText) > MAX_SCAN_RESPONSE_BYTES) throw new Error("Scanner response is too large");
  const result = JSON.parse(responseText) as Partial<ScannerVerdict>;
  if ((result.status !== "clean" && result.status !== "infected") || !result.engine?.trim()) {
    throw new Error("Scanner returned an invalid verdict");
  }
  return result as ScannerVerdict;
}

export async function scanQuarantinedDocuments(batchSize = DEFAULT_BATCH_SIZE) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) {
    throw new Error("Scanner batch size must be between 1 and 25");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Generated database types will be refreshed when this migration is applied.
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc("claim_secure_documents_for_scan", {
    batch_limit: batchSize,
  });
  if (error) throw new Error(`Could not claim quarantined documents: ${error.message}`);

  const result = { claimed: data?.length ?? 0, clean: 0, rejected: 0, deletion_queued: 0, failed: 0 };
  for (const document of (data ?? []) as ClaimedDocument[]) {
    try {
      const { data: stored, error: downloadError } = await admin.storage
        .from(BUCKET)
        .download(document.storage_path);
      if (downloadError || !stored) throw new Error("Quarantined object is unavailable");
      const content = new Uint8Array(await stored.arrayBuffer());
      if (computeSha256(content) !== document.sha256) throw new Error("Quarantined object hash mismatch");

      const verdict = await scan(content, document.mime_type);
      const securityStatus = document.deletion_requested_at
        ? "deleting"
        : verdict.status === "clean" ? "clean" : "rejected";
      const { error: updateError } = await admin
        .from("secure_documents")
        .update({
          security_status: securityStatus,
          scanner_name: verdict.engine,
          scanner_result: {
            verdict: verdict.status,
            signature: verdict.signature ?? null,
            definitions_version: verdict.definitionsVersion ?? null,
          },
          scanned_at: new Date().toISOString(),
          last_scan_error: null,
        })
        .eq("id", document.id)
        .eq("security_status", "scanning");
      if (updateError) throw new Error(`Could not save scanner verdict: ${updateError.message}`);

      if (securityStatus === "rejected") {
        await admin.storage.from(BUCKET).remove([document.storage_path]);
        result.rejected += 1;
      } else if (securityStatus === "clean") {
        result.clean += 1;
      } else {
        result.deletion_queued += 1;
      }
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown scanner failure";
      await admin
        .from("secure_documents")
        .update({
          security_status: document.deletion_requested_at ? "deleting" : "quarantined",
          last_scan_error: message,
        })
        .eq("id", document.id)
        .eq("security_status", "scanning");
    }
  }
  return result;
}
