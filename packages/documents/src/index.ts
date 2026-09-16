/**
 * @mailmypdf/documents — Reusable document foundation with security boundaries.
 *
 * Documents are treated as untrusted input. This package defines the
 * canonical document model, lifecycle, security validation, provenance,
 * versioning, relationships, and extraction contracts.
 *
 * The platform owns the model. Verticals own the extraction implementations.
 *
 * Trust boundaries:
 * - Document content is untrusted until validated
 * - Extracted text is untrusted (prompt injection risk) — sanitize before AI use
 * - Filenames are untrusted (path traversal risk) — sanitize before storage
 * - Source URLs are untrusted (SSRF risk) — validate before fetching
 */

import type {
  Confidence,
  PlatformId,
  ValidationResult,
  Result,
} from "@mailmypdf/core";
import { confidence, ok, err, validateRange, validateNonEmpty, validateOneOf, validateMaxLength, ValidationError } from "@mailmypdf/core";

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT KINDS
// ═══════════════════════════════════════════════════════════════════════════════

export type DocumentKind =
  | "unknown"
  | "notice"
  | "decision"
  | "correspondence"
  | "evidence"
  | "form"
  | "receipt"
  | "contract"
  | "identification"
  | "other";

export const ALL_DOCUMENT_KINDS: readonly DocumentKind[] = [
  "unknown", "notice", "decision", "correspondence", "evidence",
  "form", "receipt", "contract", "identification", "other",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

export type DocumentStatus =
  | "uploaded"
  | "validating"
  | "processing"
  | "extracted"
  | "classified"
  | "analyzed"
  | "ready"
  | "failed";

export const DOCUMENT_TRANSITIONS: Readonly<Record<DocumentStatus, readonly DocumentStatus[]>> = {
  uploaded:    ["validating", "failed"],
  validating:  ["processing", "failed"],
  processing:  ["extracted", "failed"],
  extracted:   ["classified", "analyzed", "ready", "failed"],
  classified:  ["analyzed", "ready", "failed"],
  analyzed:    ["ready", "failed"],
  ready:       [],
  failed:      ["uploaded"],
} as const;

export function canTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return DOCUMENT_TRANSITIONS[from].includes(to);
}

export function transition(
  from: DocumentStatus,
  to: DocumentStatus,
): Result<DocumentStatus, ValidationError> {
  if (!canTransition(from, to)) {
    return err(new ValidationError(
      `Invalid document transition: ${from} → ${to}`,
      { from, to, allowed: DOCUMENT_TRANSITIONS[from] },
    ));
  }
  return ok(to);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE REFERENCE — canonical pointer to a spot in a document
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SourceRef is the provenance anchor for the entire intelligence system.
 * Every fact, evidence item, finding, timeline event, and deadline
 * traces back to a specific location in a specific document.
 *
 * This prevents downstream AI systems from losing the connection
 * between a claim and its source document.
 */
export interface SourceRef {
  readonly documentId: PlatformId;
  readonly documentName: string;
  readonly page?: number | undefined;
  readonly excerpt?: string | undefined;
  /** Character offset in the extracted text */
  readonly offset?: number | undefined;
}

export function createSourceRef(input: {
  documentId: PlatformId;
  documentName: string;
  page?: number;
  excerpt?: string;
  offset?: number;
}): SourceRef {
  if (input.page !== undefined) {
    const pageCheck = validateRange(input.page, "page", 1, MAX_PAGES);
    if (!pageCheck.ok) throw pageCheck.error;
  }
  return {
    documentId: input.documentId,
    documentName: input.documentName,
    page: input.page,
    excerpt: input.excerpt,
    offset: input.offset,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY — MIME TYPES, PDF TOKENS, SIZE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALLOWED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "text/plain",
] as const;

export const DANGEROUS_MIME_TYPES: readonly string[] = [
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
  "application/x-executable",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-bat",
  "text/html",
] as const;

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isDangerousMimeType(mimeType: string): boolean {
  return DANGEROUS_MIME_TYPES.includes(mimeType);
}

/**
 * Detect the small allowlisted set of binary formats from their signatures.
 * Browser-supplied MIME types and filename extensions are untrusted.
 */
export function detectMimeType(content: Uint8Array): string | null {
  if (content.length >= 5 && new TextDecoder("latin1").decode(content.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }
  if (
    content.length >= 8 &&
    content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4e && content[3] === 0x47 &&
    content[4] === 0x0d && content[5] === 0x0a && content[6] === 0x1a && content[7] === 0x0a
  ) {
    return "image/png";
  }
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    content.length >= 4 &&
    ((content[0] === 0x49 && content[1] === 0x49 && content[2] === 0x2a && content[3] === 0x00) ||
      (content[0] === 0x4d && content[1] === 0x4d && content[2] === 0x00 && content[3] === 0x2a))
  ) {
    return "image/tiff";
  }
  return null;
}

// ── PDF Security ──────────────────────────────────────────────────────────────

export const FORBIDDEN_PDF_TOKENS: readonly string[] = [
  "/JavaScript", "/JS", "/Launch", "/OpenAction", "/RichMedia",
  "/EmbeddedFile", "/EmbeddedFiles", "/SubmitForm", "/ImportData", "/GoToE",
] as const;

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TEXT_BYTES = 1024 * 1024; // 1 MB
export const MAX_PAGES = 20;
export const MAX_FILENAME_LENGTH = 255;

// ── Filename Sanitization ────────────────────────────────────────────────────

// Patterns for .test() — NO g flag (g flag on .test() is stateful and causes
// alternating false negatives across calls because lastIndex persists).
const PATH_TRAVERSAL_TEST_PATTERNS: readonly RegExp[] = [
  /\.\./,           // parent directory
  /\.\//,           // relative path
  /\\/,              // backslash
  /^\//,             // absolute path
  /\x00/,            // null byte
  /\//,              // any forward slash (filenames must not contain path separators)
] as const;

// Patterns for .replace() — WITH g flag (replace always resets to 0).
const PATH_TRAVERSAL_REPLACE_PATTERNS: readonly RegExp[] = [
  /\.\./g,          // parent directory
  /\.\//g,           // relative path
  /\\/g,            // backslash
  /^\//g,            // leading absolute path
  /\x00/g,           // null byte
  /\//g,             // all forward slashes (filenames must not contain path separators)
] as const;

export function sanitizeFilename(filename: string): string {
  let sanitized = filename.trim();
  for (const pattern of PATH_TRAVERSAL_REPLACE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "_");
  }
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");
  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, "_");
  // Limit length
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.lastIndexOf(".");
    if (ext > 0) {
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH - (sanitized.length - ext)) + sanitized.slice(ext);
    } else {
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH);
    }
  }
  return sanitized;
}

export function isSafeFilename(filename: string): boolean {
  for (const pattern of PATH_TRAVERSAL_TEST_PATTERNS) {
    if (pattern.test(filename)) return false;
  }
  if (/[\x00-\x1f\x7f]/.test(filename)) return false;
  return true;
}

// ── URL Validation (SSRF prevention) ─────────────────────────────────────────

const SSRF_BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "[::]",
  "169.254.", // link-local
  "10.", "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
  "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
  "172.30.", "172.31.", "192.168.", // private ranges
  "127.", "0.0.0.0", // loopback range
] as const;

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    for (const blocked of SSRF_BLOCKED_HOSTS) {
      if (host === blocked || host.startsWith(blocked)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Content Sanitization (prompt injection defense) ────────────────────────────

/**
 * Sanitize extracted text for safe AI consumption.
 * This does NOT remove content — it marks suspicious patterns
 * so downstream AI systems can be aware of potential injection.
 */
export function sanitizeExtractedText(text: string): { text: string; warnings: string[] } {
  const warnings: string[] = [];

  // Detect potential prompt injection patterns
  if (/ignore (previous |above )?instructions?/i.test(text)) {
    warnings.push("Potential prompt injection: 'ignore instructions' pattern detected");
  }
  if (/you are (now )?(a|an) /i.test(text)) {
    warnings.push("Potential prompt injection: role reassignment pattern detected");
  }
  if (/system\s*:/i.test(text)) {
    warnings.push("Potential prompt injection: 'system:' prefix detected");
  }
  if (/\[INST\]|\[\/INST\]/i.test(text)) {
    warnings.push("Potential prompt injection: instruction token detected");
  }

  // Remove null bytes
  const cleaned = text.replace(/\x00/g, "");

  return { text: cleaned, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

export type ProvenanceSourceType = "upload" | "mailing" | "user-entry" | "external" | "generated";

export interface DocumentProvenance {
  readonly sourceId: PlatformId;
  readonly sourceType: ProvenanceSourceType;
  readonly uploadedAt: string;
  readonly uploadedBy?: string | undefined;
  readonly originalFilename?: string | undefined;
  readonly sourceUrl?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface PageMetadata {
  readonly pageNumber: number;
  readonly text?: string | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly confidence?: Confidence | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT VERSIONING
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentVersion {
  readonly version: number;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly note?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════════

export type RelationshipType =
  | "supersedes"       // new version replaces old
  | "responds_to"      // response to another document
  | "evidence_for"     // supports a claim in another doc
  | "evidence_against" // contradicts a claim in another doc
  | "appendix_of"      // appendix to another doc
  | "attachment_of"    // attachment to another doc
  | "references"      // references another doc
  | "derived_from";   // derived from another doc

export interface DocumentRelationship {
  readonly fromDocumentId: PlatformId;
  readonly toDocumentId: PlatformId;
  readonly type: RelationshipType;
  readonly note?: string | undefined;
  readonly createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT RECORD
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentRecord {
  readonly id: PlatformId;
  readonly name: string;
  readonly kind: DocumentKind;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256?: string | undefined;
  readonly pageCount?: number | undefined;
  readonly status: DocumentStatus;
  readonly extractedText?: string | undefined;
  readonly pages?: readonly PageMetadata[] | undefined;
  readonly provenance: DocumentProvenance;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly version: number;
  readonly versions?: readonly DocumentVersion[] | undefined;
  readonly relationships?: readonly DocumentRelationship[] | undefined;
  readonly classificationConfidence?: Confidence | undefined;
  readonly extractionWarnings?: readonly string[] | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASHING
// ═══════════════════════════════════════════════════════════════════════════════

// Pure-JS SHA-256 (no node:crypto) so this runs identically in the browser
// and on the server — this package is imported client-side wherever a
// vertical builds or previews a packet before it reaches storage (see
// notice-respond's tax-notice-packet.ts), and node:crypto is externalized
// (and throws at call time) in a browser bundle. Standard FIPS 180-4
// algorithm, so output is bit-identical to node:crypto's for the same bytes.
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const SHA256_H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Hex(data: Uint8Array): string {
  const bitLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  // Bit length as a 64-bit big-endian integer in the last 8 bytes.
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 2 ** 32), false);

  const h = SHA256_H0.slice();
  const w = new Int32Array(64);

  for (let chunkStart = 0; chunkStart < paddedLength; chunkStart += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(chunkStart + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      hh = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }

  return h.map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}

export function computeSha256(data: Uint8Array): string {
  return sha256Hex(data);
}

/**
 * Check if two documents are duplicates by comparing SHA-256 hashes.
 */
export function isDuplicate(docA: DocumentRecord, docB: DocumentRecord): boolean {
  if (docA.sha256 && docB.sha256) {
    return docA.sha256 === docB.sha256;
  }
  // Fall back to size + name comparison if hashes are missing
  return docA.sizeBytes === docB.sizeBytes && docA.name === docB.name;
}

/**
 * Find duplicates in a list of documents.
 */
export function findDuplicates(documents: readonly DocumentRecord[]): Map<string, DocumentRecord[]> {
  const byHash = new Map<string, DocumentRecord[]>();
  for (const doc of documents) {
    if (!doc.sha256) continue;
    const existing = byHash.get(doc.sha256);
    if (existing) {
      existing.push(doc);
    } else {
      byHash.set(doc.sha256, [doc]);
    }
  }
  // Only return groups with more than one document
  const duplicates = new Map<string, DocumentRecord[]>();
  for (const [hash, docs] of byHash) {
    if (docs.length > 1) duplicates.set(hash, docs);
  }
  return duplicates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentValidationInput {
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly pageCount?: number | undefined;
  readonly content?: Uint8Array | undefined;
}

export function validateDocument(input: DocumentValidationInput): ValidationResult {
  // ── Filename ──────────────────────────────────────────────────────────────
  const filenameCheck = validateNonEmpty(input.filename, "filename");
  if (!filenameCheck.ok) return filenameCheck;

  const filenameLenCheck = validateMaxLength(input.filename, "filename", MAX_FILENAME_LENGTH);
  if (!filenameLenCheck.ok) return filenameLenCheck;

  if (!isSafeFilename(input.filename)) {
    return err(new ValidationError(
      "Filename contains path traversal characters",
      { filename: input.filename },
    ));
  }

  // ── MIME type ──────────────────────────────────────────────────────────────
  const mimeCheck = validateNonEmpty(input.mimeType, "mimeType");
  if (!mimeCheck.ok) return mimeCheck;

  if (isDangerousMimeType(input.mimeType)) {
    return err(new ValidationError(
      `MIME type "${input.mimeType}" is not allowed — dangerous content type`,
      { mimeType: input.mimeType },
    ));
  }

  if (!isAllowedMimeType(input.mimeType)) {
    return err(new ValidationError(
      `MIME type "${input.mimeType}" is not supported`,
      { mimeType: input.mimeType, allowed: ALLOWED_MIME_TYPES },
    ));
  }

  if (input.content && !input.mimeType.startsWith("text/")) {
    const detectedMimeType = detectMimeType(input.content);
    if (!detectedMimeType || detectedMimeType !== input.mimeType) {
      return err(new ValidationError(
        "Declared MIME type does not match the file signature",
        { declaredMimeType: input.mimeType, detectedMimeType },
      ));
    }
  }

  // ── Size (varies by type) ───────────────────────────────────────────────────
  let maxBytes = MAX_PDF_BYTES;
  if (input.mimeType === "application/pdf") maxBytes = MAX_PDF_BYTES;
  else if (input.mimeType.startsWith("image/")) maxBytes = MAX_IMAGE_BYTES;
  else if (input.mimeType.startsWith("text/")) maxBytes = MAX_TEXT_BYTES;

  const sizeCheck = validateRange(input.sizeBytes, "sizeBytes", 1, maxBytes);
  if (!sizeCheck.ok) return sizeCheck;

  // ── Pages ────────────────────────────────────────────────────────────────────
  if (input.pageCount !== undefined) {
    const pageCheck = validateRange(input.pageCount, "pageCount", 1, MAX_PAGES);
    if (!pageCheck.ok) return pageCheck;
  }

  // ── PDF content security scan ─────────────────────────────────────────────────
  if (input.mimeType === "application/pdf" && input.content) {
    const contentStr = new TextDecoder("latin1").decode(input.content);

    // Check for forbidden PDF tokens
    for (const token of FORBIDDEN_PDF_TOKENS) {
      if (contentStr.includes(token)) {
        return err(new ValidationError(
          `PDF contains forbidden token: ${token}`,
          { token },
        ));
      }
    }

    // Encrypted PDFs not supported
    if (contentStr.includes("/Encrypt")) {
      return err(new ValidationError("Encrypted PDFs are not supported"));
    }

    // Valid PDF header
    if (!contentStr.startsWith("%PDF-")) {
      return err(new ValidationError("File does not have a valid PDF header"));
    }

    // PDF end-of-file marker
    if (!contentStr.includes("%%EOF")) {
      return err(new ValidationError("PDF is missing its end-of-file marker"));
    }
  }

  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS (interfaces for verticals to implement)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentClassifier {
  classify(text: string, metadata?: Record<string, unknown>): Promise<{ kind: DocumentKind; confidence: Confidence }>;
}

export interface DocumentExtractor {
  extract(document: DocumentRecord): Promise<ExtractionResult>;
}

export interface ExtractionResult {
  readonly text: string;
  readonly pages: readonly PageMetadata[];
  readonly confidence: Confidence;
  readonly warnings: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createDocument(input: {
  id: PlatformId;
  name: string;
  kind: DocumentKind;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  pageCount?: number;
  provenance: DocumentProvenance;
  metadata?: Record<string, unknown>;
  content?: Uint8Array;
}): DocumentRecord {
  // Sanitize filename first
  const safeName = sanitizeFilename(input.name);

  const validation = validateDocument({
    filename: safeName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    pageCount: input.pageCount,
    content: input.content,
  });
  if (!validation.ok) throw validation.error;

  const kindCheck = validateOneOf(input.kind, "kind", ALL_DOCUMENT_KINDS);
  if (!kindCheck.ok) throw kindCheck.error;

  // Compute hash if content is provided but sha256 is not
  let sha256 = input.sha256;
  if (!sha256 && input.content) {
    sha256 = computeSha256(input.content);
  }

  const now = new Date().toISOString();
  return {
    id: input.id,
    name: safeName,
    kind: input.kind,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sha256,
    pageCount: input.pageCount,
    status: "uploaded",
    provenance: input.provenance,
    metadata: input.metadata,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

export function updateDocumentStatus(
  document: DocumentRecord,
  newStatus: DocumentStatus,
): Result<DocumentRecord, ValidationError> {
  const result = transition(document.status, newStatus);
  if (!result.ok) return result;
  return ok({
    ...document,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSIONING
// ═══════════════════════════════════════════════════════════════════════════════

export function createNewVersion(
  document: DocumentRecord,
  newContent: Uint8Array,
  note?: string,
): DocumentRecord {
  const newHash = computeSha256(newContent);
  const newVersion: DocumentVersion = {
    version: document.version,
    sha256: document.sha256 ?? "",
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    note,
  };

  return {
    ...document,
    version: document.version + 1,
    sha256: newHash,
    sizeBytes: newContent.length,
    versions: [...(document.versions ?? []), newVersion],
    status: "uploaded",
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════════

export function addRelationship(
  document: DocumentRecord,
  toDocumentId: PlatformId,
  type: RelationshipType,
  note?: string,
): DocumentRecord {
  const relationship: DocumentRelationship = {
    fromDocumentId: document.id,
    toDocumentId,
    type,
    note,
    createdAt: new Date().toISOString(),
  };
  return {
    ...document,
    relationships: [...(document.relationships ?? []), relationship],
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

export function setExtractionResult(
  document: DocumentRecord,
  result: ExtractionResult,
): DocumentRecord {
  const { text: sanitizedText, warnings } = sanitizeExtractedText(result.text);
  const allWarnings = [...result.warnings, ...warnings];

  return {
    ...document,
    extractedText: sanitizedText,
    pages: result.pages,
    extractionWarnings: allWarnings,
    status: canTransition(document.status, "extracted") ? "extracted" : document.status,
    updatedAt: new Date().toISOString(),
  };
}

export function setClassification(
  document: DocumentRecord,
  kind: DocumentKind,
  conf: Confidence,
): DocumentRecord {
  return {
    ...document,
    kind,
    classificationConfidence: conf,
    status: canTransition(document.status, "classified") ? "classified" : document.status,
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type { Confidence, PlatformId, ValidationResult } from "@mailmypdf/core";

// ── Local Result type alias (matches core's Result) ───────────────────────────



// ═══════════════════════════════════════════════════════════════════════════════
// SECURE DOCUMENT VAULT — shared quarantine / scan / retention capability
// ═══════════════════════════════════════════════════════════════════════════════

export type DocumentSecurityStatus =
  | "quarantined"
  | "scanning"
  | "clean"
  | "rejected"
  | "deleting"
  | "deleted";

export interface SecureDocumentEnvelope {
  readonly id: string;
  readonly ownerId: string;
  readonly workflowId: string;
  readonly purpose: string;
  readonly safeFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly storagePath: string;
  readonly securityStatus: DocumentSecurityStatus;
  readonly retentionUntil: string;
  readonly deletedAt?: string | null;
  readonly deletionRequestedAt?: string | null;
}

export interface DocumentProcessingConsentStore {
  recordConsent(input: {
    ownerId: string;
    workflowId: string;
    purpose: string;
    consentVersion: string;
    recordedAt: string;
  }): Promise<string>;
}

export interface QuarantineStorage {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface SecureDocumentRegistry {
  register(input: SecureDocumentEnvelope & { consentId: string }): Promise<SecureDocumentEnvelope>;
}

export interface MalwareScanVerdict {
  status: "clean" | "infected";
  engine: string;
  signature?: string;
  definitionsVersion?: string;
}

export interface MalwareScanner {
  scan(input: {
    bytes: Uint8Array;
    mimeType: string;
    sha256: string;
  }): Promise<MalwareScanVerdict>;
}

export interface SecureDocumentIntakeRequest {
  ownerId: string;
  workflowId: string;
  purpose: string;
  consent: boolean;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  retentionUntil: string;
  documentId?: string;
  now?: string;
}

export function validateDocumentPurpose(purpose: string): string {
  const normalized = purpose.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) {
    throw new ValidationError("Document purpose must be a 3-64 character purpose code");
  }
  return normalized;
}

export function buildSecureDocumentPath(ownerId: string, documentId: string, filename: string): string {
  const owner = ownerId.trim();
  const id = documentId.trim();
  if (!owner || owner.includes("/") || owner.includes("\\") || owner.includes("..")) {
    throw new ValidationError("Invalid document owner id");
  }
  if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) {
    throw new ValidationError("Invalid document id");
  }
  return `${owner}/${id}/${sanitizeFilename(filename)}`;
}

export function computeRetentionUntil(days: number, now = new Date()): string {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new ValidationError("Retention days must be an integer between 1 and 3650");
  }
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

export function isDocumentDisclosable(
  document: Pick<SecureDocumentEnvelope, "securityStatus" | "retentionUntil" | "deletedAt" | "deletionRequestedAt">,
  now = Date.now(),
): boolean {
  return (
    document.securityStatus === "clean" &&
    !document.deletedAt &&
    !document.deletionRequestedAt &&
    Number.isFinite(Date.parse(document.retentionUntil)) &&
    Date.parse(document.retentionUntil) > now
  );
}

export function assertDocumentDisclosable(
  document: Pick<SecureDocumentEnvelope, "securityStatus" | "retentionUntil" | "deletedAt" | "deletionRequestedAt">,
  now = Date.now(),
): void {
  if (!isDocumentDisclosable(document, now)) {
    throw new ValidationError("Document is not cleared for disclosure");
  }
}

export function verifyStoredDocument(
  document: Pick<SecureDocumentEnvelope, "mimeType" | "sizeBytes" | "sha256" | "safeFilename">,
  bytes: Uint8Array,
): ValidationResult {
  if (bytes.byteLength !== document.sizeBytes) {
    return err(new ValidationError("Stored document size does not match intake metadata"));
  }
  if (computeSha256(bytes) !== document.sha256) {
    return err(new ValidationError("Stored document hash does not match intake metadata"));
  }
  return validateDocument({
    filename: document.safeFilename,
    mimeType: document.mimeType,
    sizeBytes: bytes.byteLength,
    content: bytes,
  });
}

export async function intakeDocumentToQuarantine(
  input: SecureDocumentIntakeRequest,
  deps: {
    consents: DocumentProcessingConsentStore;
    storage: QuarantineStorage;
    registry: SecureDocumentRegistry;
  },
): Promise<SecureDocumentEnvelope> {
  if (!input.consent) throw new ValidationError("Explicit document-processing consent is required");
  if (!input.ownerId.trim()) throw new ValidationError("Document owner is required");
  if (!input.workflowId.trim()) throw new ValidationError("Workflow id is required");

  const purpose = validateDocumentPurpose(input.purpose);
  const validation = validateDocument({
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    content: input.bytes,
  });
  if (!validation.ok) throw validation.error;

  const retentionMs = Date.parse(input.retentionUntil);
  const now = input.now ?? new Date().toISOString();
  if (!Number.isFinite(retentionMs) || retentionMs <= Date.parse(now)) {
    throw new ValidationError("Document retention must end in the future");
  }

  const id = input.documentId ?? globalThis.crypto.randomUUID();
  const safeFilename = sanitizeFilename(input.filename);
  const storagePath = buildSecureDocumentPath(input.ownerId, id, safeFilename);
  const consentId = await deps.consents.recordConsent({
    ownerId: input.ownerId,
    workflowId: input.workflowId,
    purpose,
    consentVersion: "secure-document-intake-v1",
    recordedAt: now,
  });

  await deps.storage.put(storagePath, input.bytes, input.mimeType);
  const envelope: SecureDocumentEnvelope = {
    id,
    ownerId: input.ownerId,
    workflowId: input.workflowId,
    purpose,
    safeFilename,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    sha256: computeSha256(input.bytes),
    storagePath,
    securityStatus: "quarantined",
    retentionUntil: new Date(retentionMs).toISOString(),
  };

  try {
    return await deps.registry.register({ ...envelope, consentId });
  } catch (error) {
    await deps.storage.remove(storagePath).catch(() => {});
    throw error;
  }
}

export async function evaluateQuarantinedDocument(
  document: SecureDocumentEnvelope,
  bytes: Uint8Array,
  scanner: MalwareScanner,
): Promise<{
  securityStatus: "clean" | "rejected";
  verdict: MalwareScanVerdict;
}> {
  if (document.securityStatus !== "quarantined" && document.securityStatus !== "scanning") {
    throw new ValidationError("Only quarantined documents may be security scanned");
  }
  const integrity = verifyStoredDocument(document, bytes);
  if (!integrity.ok) {
    return {
      securityStatus: "rejected",
      verdict: { status: "infected", engine: "mailmypdf-static-validation", signature: integrity.error.message },
    };
  }
  const verdict = await scanner.scan({ bytes, mimeType: document.mimeType, sha256: document.sha256 });
  return { securityStatus: verdict.status === "clean" ? "clean" : "rejected", verdict };
}

export function shouldPurgeSecureDocument(
  document: Pick<SecureDocumentEnvelope, "securityStatus" | "retentionUntil" | "deletionRequestedAt">,
  now = Date.now(),
): boolean {
  if (document.securityStatus === "deleted") return false;
  if (document.deletionRequestedAt) return true;
  const retention = Date.parse(document.retentionUntil);
  return Number.isFinite(retention) && retention <= now;
}


// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIED DOCUMENT RETRIEVAL — never disclose storage bytes without re-checking
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecureDocumentStorage extends QuarantineStorage {
  get(path: string): Promise<Uint8Array>;
}

export interface SecureDocumentAccessAudit {
  record(input: {
    documentId: string;
    ownerId: string;
    purpose: string;
    action: "read";
    occurredAt: string;
  }): Promise<void>;
}

/**
 * Reads a clean document from storage for an authorized owner and verifies the
 * bytes against the immutable intake metadata before returning them.
 *
 * This is the canonical seam for downstream extraction/vision. Callers should
 * not read secure storage directly.
 */
export async function loadVerifiedDocumentBytes(
  document: SecureDocumentEnvelope,
  ownerId: string,
  purpose: string,
  storage: SecureDocumentStorage,
  audit?: SecureDocumentAccessAudit,
  now = Date.now(),
): Promise<Uint8Array> {
  if (!ownerId.trim() || document.ownerId !== ownerId) {
    throw new ValidationError("Document is not accessible for this owner");
  }
  assertDocumentDisclosable(document, now);
  if (!document.storagePath.startsWith(`${document.ownerId}/`)) {
    throw new ValidationError("Document storage path is outside the owner scope");
  }

  const bytes = await storage.get(document.storagePath);
  const verification = verifyStoredDocument(document, bytes);
  if (!verification.ok) throw verification.error;

  if (audit) {
    await audit.record({
      documentId: document.id,
      ownerId,
      purpose: validateDocumentPurpose(purpose),
      action: "read",
      occurredAt: new Date(now).toISOString(),
    });
  }
  return bytes;
}
