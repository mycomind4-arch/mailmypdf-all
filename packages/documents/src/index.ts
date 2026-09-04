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
import { createHash } from "node:crypto";

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

export function computeSha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
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

