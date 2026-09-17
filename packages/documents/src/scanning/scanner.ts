import {
  computeSha256,
  evaluateQuarantinedDocument,
  type MalwareScanVerdict,
  type SecureDocumentEnvelope,
} from "../index.js";

export interface ClaimedSecureDocument {
  id: string;
  ownerId: string;
  workflowId: string;
  storagePath: string;
  safeFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  retentionUntil: string;
  deletionRequestedAt?: string | null;
  deletedAt?: string | null;
}

export interface SecureDocumentScannerStore {
  claim(batchSize: number): Promise<readonly ClaimedSecureDocument[]>;
  readBytes(document: ClaimedSecureDocument): Promise<Uint8Array>;
  saveVerdict(input: {
    documentId: string;
    expectedStatus: "scanning";
    securityStatus: "clean" | "rejected" | "deleting";
    scannerName: string;
    scannerResult: {
      verdict: "clean" | "infected";
      signature: string | null;
      definitionsVersion: string | null;
    };
    scannedAt: string;
  }): Promise<void>;
  removeObject(document: ClaimedSecureDocument): Promise<void>;
  saveFailure(input: {
    documentId: string;
    expectedStatus: "scanning";
    securityStatus: "quarantined" | "deleting";
    message: string;
  }): Promise<void>;
}

export interface MalwareScannerClient {
  scan(input: {
    bytes: Uint8Array;
    mimeType: string;
    sha256: string;
  }): Promise<MalwareScanVerdict>;
}

function equalSecret(candidate: string, expected: string): boolean {
  const left = new TextEncoder().encode(candidate);
  const right = new TextEncoder().encode(expected);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export function requireJobAuthorization(
  request: Request,
  secret: string,
  options: { minimumLength?: number } = {},
): void {
  const minimumLength = options.minimumLength ?? 32;
  if (secret.length < minimumLength) throw new Error(`Job secret must contain at least ${minimumLength} characters`);

  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !equalSecret(supplied, secret)) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export function createHttpMalwareScanner(input: {
  url: string | URL;
  apiKey: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowLoopbackInDevelopment?: boolean;
  environment?: string;
}): MalwareScannerClient {
  const url = input.url instanceof URL ? input.url : new URL(input.url);
  const allowLoopback = input.allowLoopbackInDevelopment === true &&
    input.environment !== "production" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");

  if (url.protocol !== "https:" && !allowLoopback) {
    throw new Error("Malware scanner must use HTTPS");
  }
  if (input.apiKey.length < 32) throw new Error("Scanner API key must contain at least 32 characters");

  const timeoutMs = input.timeoutMs ?? 30_000;
  const maxResponseBytes = input.maxResponseBytes ?? 16_384;

  return {
    async scan(request) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": request.mimeType,
          "X-Content-SHA256": request.sha256,
        },
        body: Uint8Array.from(request.bytes).buffer,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) throw new Error(`Scanner returned HTTP ${response.status}`);
      const responseText = await response.text();
      if (new TextEncoder().encode(responseText).byteLength > maxResponseBytes) {
        throw new Error("Scanner response is too large");
      }

      const result = JSON.parse(responseText) as Partial<MalwareScanVerdict>;
      if ((result.status !== "clean" && result.status !== "infected") || !result.engine?.trim()) {
        throw new Error("Scanner returned an invalid verdict");
      }
      return result as MalwareScanVerdict;
    },
  };
}

function toEnvelope(document: ClaimedSecureDocument): SecureDocumentEnvelope {
  return {
    id: document.id,
    ownerId: document.ownerId,
    workflowId: document.workflowId,
    purpose: "security_scan",
    safeFilename: document.safeFilename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    sha256: document.sha256,
    storagePath: document.storagePath,
    securityStatus: "scanning",
    retentionUntil: document.retentionUntil,
    deletionRequestedAt: document.deletionRequestedAt ?? null,
    deletedAt: document.deletedAt ?? null,
  };
}

/**
 * Claims quarantined documents, revalidates immutable intake metadata and file
 * structure, invokes the external scanner, and only releases documents that
 * pass both checks. Rejected bytes are destroyed after the verdict is stored.
 */
export async function scanQuarantinedDocuments(input: {
  store: SecureDocumentScannerStore;
  scanner: MalwareScannerClient;
  batchSize?: number;
  now?: () => string;
}): Promise<{
  claimed: number;
  clean: number;
  rejected: number;
  deletionQueued: number;
  failed: number;
}> {
  const batchSize = input.batchSize ?? 10;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) {
    throw new Error("Scanner batch size must be between 1 and 25");
  }

  const documents = await input.store.claim(batchSize);
  const result = { claimed: documents.length, clean: 0, rejected: 0, deletionQueued: 0, failed: 0 };

  for (const document of documents) {
    try {
      const bytes = await input.store.readBytes(document);
      if (bytes.byteLength !== document.sizeBytes || computeSha256(bytes) !== document.sha256) {
        throw new Error("Quarantined object does not match immutable intake metadata");
      }

      const evaluation = await evaluateQuarantinedDocument(toEnvelope(document), bytes, {
        scan: ({ bytes: content, mimeType }) => input.scanner.scan({
          bytes: content,
          mimeType,
          sha256: computeSha256(content),
        }),
      });

      const securityStatus = document.deletionRequestedAt ? "deleting" : evaluation.securityStatus;
      const verdict = evaluation.verdict;
      await input.store.saveVerdict({
        documentId: document.id,
        expectedStatus: "scanning",
        securityStatus,
        scannerName: verdict.engine,
        scannerResult: {
          verdict: verdict.status,
          signature: verdict.signature ?? null,
          definitionsVersion: verdict.definitionsVersion ?? null,
        },
        scannedAt: (input.now ?? (() => new Date().toISOString()))(),
      });

      if (securityStatus === "rejected") {
        await input.store.removeObject(document);
        result.rejected += 1;
      } else if (securityStatus === "clean") {
        result.clean += 1;
      } else {
        result.deletionQueued += 1;
      }
    } catch (error) {
      result.failed += 1;
      await input.store.saveFailure({
        documentId: document.id,
        expectedStatus: "scanning",
        securityStatus: document.deletionRequestedAt ? "deleting" : "quarantined",
        message: (error instanceof Error ? error.message : "Unknown scanner failure").slice(0, 500),
      });
    }
  }

  return result;
}
