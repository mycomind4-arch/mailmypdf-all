export type VisionMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/tiff";

export interface VerifiedVisualDocument {
  documentId: string;
  fileName: string;
  mimeType: VisionMimeType;
  bytes: Uint8Array;
  sha256: string;
  securityStatus: "clean";
}

export interface DocumentVisionRequest {
  purpose: string;
  instruction: string;
  outputSchema: string;
  promptVersion: string;
}

export interface DocumentVisionProviderResult<T> {
  output: T;
  provider: string;
  model: string;
  confidence: number;
  warnings?: readonly string[];
}

export interface DocumentVisionProvider {
  analyze<T>(input: {
    document: VerifiedVisualDocument;
    request: DocumentVisionRequest;
    signal?: AbortSignal;
  }): Promise<DocumentVisionProviderResult<T>>;
}

export interface DocumentVisionAnalysis<T> extends DocumentVisionProviderResult<T> {
  source: {
    documentId: string;
    documentName: string;
    sha256: string;
    mimeType: VisionMimeType;
  };
  purpose: string;
  promptVersion: string;
}

export const MAX_VISUAL_DOCUMENT_BYTES = 24 * 1024 * 1024;

export interface DocumentVisionPolicy {
  maxBytes: number;
  timeoutMs: number;
  allowedProviders?: readonly string[];
}

export const DEFAULT_DOCUMENT_VISION_POLICY: DocumentVisionPolicy = {
  maxBytes: MAX_VISUAL_DOCUMENT_BYTES,
  timeoutMs: 90_000,
};

async function withVisionTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Vision timeout must be positive");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<T>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("VISION_ANALYSIS_TIMEOUT")), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const stable = new Uint8Array(bytes.byteLength);
  stable.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", stable.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function validatePurpose(purpose: string): string {
  const value = purpose.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(value)) {
    throw new Error("Vision-analysis purpose must be a 3-64 character purpose code");
  }
  return value;
}

/**
 * Provider-neutral visual/PDF analysis boundary.
 *
 * The caller must supply a document that has already cleared the secure vault.
 * The function re-verifies the byte hash before any provider receives content,
 * so stale or swapped bytes fail closed.
 */
export async function analyzeVisualDocument<T>(
  document: VerifiedVisualDocument,
  request: DocumentVisionRequest,
  provider: DocumentVisionProvider,
  validateOutput: (value: unknown) => value is T,
  policy: DocumentVisionPolicy = DEFAULT_DOCUMENT_VISION_POLICY,
): Promise<DocumentVisionAnalysis<T>> {
  if (document.securityStatus !== "clean") throw new Error("Document has not cleared security scanning");
  if (!document.documentId.trim() || !document.fileName.trim()) throw new Error("Document identity is incomplete");
  if (!Number.isFinite(policy.maxBytes) || policy.maxBytes <= 0 || policy.maxBytes > MAX_VISUAL_DOCUMENT_BYTES) {
    throw new Error("Vision maxBytes is outside the allowed range");
  }
  if (!document.bytes.byteLength || document.bytes.byteLength > policy.maxBytes) {
    throw new Error("Document is outside the supported visual-analysis size range");
  }
  if (!/^[0-9a-f]{64}$/i.test(document.sha256)) throw new Error("Document SHA-256 is invalid");
  const actualHash = await sha256Hex(document.bytes);
  if (actualHash !== document.sha256.toLowerCase()) throw new Error("Document bytes do not match the verified SHA-256");
  const purpose = validatePurpose(request.purpose);
  if (!request.instruction.trim()) throw new Error("Vision-analysis instruction is required");
  if (!request.outputSchema.trim()) throw new Error("Vision-analysis output schema is required");
  if (!request.promptVersion.trim()) throw new Error("Vision-analysis prompt version is required");

  if (request.instruction.length > 20_000) throw new Error("Vision-analysis instruction is too large");
  if (request.outputSchema.length > 20_000) throw new Error("Vision-analysis output schema is too large");

  const result = await withVisionTimeout(
    (signal) => provider.analyze<T>({ document, request: { ...request, purpose }, signal }),
    policy.timeoutMs,
  );
  if (policy.allowedProviders?.length && !policy.allowedProviders.includes(result.provider)) {
    throw new Error(`Vision-analysis provider is not allowed: ${result.provider}`);
  }
  if (!result.provider.trim() || !result.model.trim()) throw new Error("Vision-analysis provider identity is incomplete");
  if (!validateOutput(result.output)) throw new Error("Vision-analysis output failed schema validation");
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    throw new Error("Vision-analysis confidence must be between 0 and 1");
  }

  return {
    ...result,
    output: result.output,
    source: {
      documentId: document.documentId,
      documentName: document.fileName,
      sha256: document.sha256.toLowerCase(),
      mimeType: document.mimeType,
    },
    purpose,
    promptVersion: request.promptVersion,
  };
}
