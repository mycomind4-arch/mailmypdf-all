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

const MAX_VISUAL_DOCUMENT_BYTES = 24 * 1024 * 1024;

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
): Promise<DocumentVisionAnalysis<T>> {
  if (document.securityStatus !== "clean") throw new Error("Document has not cleared security scanning");
  if (!document.documentId.trim() || !document.fileName.trim()) throw new Error("Document identity is incomplete");
  if (!document.bytes.byteLength || document.bytes.byteLength > MAX_VISUAL_DOCUMENT_BYTES) {
    throw new Error("Document is outside the supported visual-analysis size range");
  }
  if (!/^[0-9a-f]{64}$/i.test(document.sha256)) throw new Error("Document SHA-256 is invalid");
  const actualHash = await sha256Hex(document.bytes);
  if (actualHash !== document.sha256.toLowerCase()) throw new Error("Document bytes do not match the verified SHA-256");
  const purpose = validatePurpose(request.purpose);
  if (!request.instruction.trim()) throw new Error("Vision-analysis instruction is required");
  if (!request.outputSchema.trim()) throw new Error("Vision-analysis output schema is required");
  if (!request.promptVersion.trim()) throw new Error("Vision-analysis prompt version is required");

  const result = await provider.analyze<T>({ document, request: { ...request, purpose } });
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
