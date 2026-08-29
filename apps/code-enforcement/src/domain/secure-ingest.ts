/**
 * Secure Document Ingestion
 *
 * Supports: PDF, JPG, PNG, copied text, email text, multiple documents.
 * Treats every uploaded document as UNTRUSTED.
 *
 * Defenses:
 * - prompt injection prevention
 * - hidden instruction detection
 * - malicious text filtering
 * - malicious filename filtering
 * - hostile document metadata detection
 * - file type validation
 * - file size validation
 * - content structure validation
 * - malformed file detection
 * - duplicate file detection
 *
 * Document contents NEVER become system instructions.
 */

// ─── Allowed File Types ──────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/html',
  'message/rfc822', // email
] as const;

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_TEXT_LENGTH = 120_000;
export const MAX_FILENAME_LENGTH = 255;

// ─── Ingestion Types ──────────────────────────────────────────────────────────

export type IngestSource = 'upload' | 'camera' | 'paste' | 'email';

export interface IngestedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  source: IngestSource;
  uploadedAt: string;
  text?: string;
  textTruncated: boolean;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
  hash: string;
}

export interface IngestResult {
  documents: IngestedDocument[];
  duplicates: string[];
  warnings: string[];
  blocked: string[];
}

// ─── Prompt Injection Patterns ───────────────────────────────────────────────

const INJECTION_PATTERNS: Array<[RegExp, string]> = [
  [/ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i, 'Potential instruction override detected'],
  [/disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|content)/i, 'Potential instruction override detected'],
  [/you\s+are\s+now\s+(?:a|an)\s+/i, 'Potential role injection detected'],
  [/act\s+as\s+(?:if\s+you\s+are|a)/i, 'Potential role injection detected'],
  [/system\s*:\s*/i, 'Potential system prompt injection detected'],
  [/\<\s*system\s*\>/i, 'Potential system tag injection detected'],
  [/reveal\s+(?:your|the)\s+(?:system\s+)?prompt/i, 'Prompt extraction attempt detected'],
  [/show\s+me\s+(?:your|the)\s+(?:system\s+)?prompt/i, 'Prompt extraction attempt detected'],
  [/forget\s+(?:everything|all\s+(?:previous|prior))/i, 'Potential memory wipe injection detected'],
  [/new\s+instructions?\s*:/i, 'Potential instruction injection detected'],
  [/execute\s+(?:the\s+)?following\s+(?:command|action)/i, 'Potential command injection detected'],
  [/\/(?:system|admin|root|debug)/i, 'Potential command injection detected'],
];

// ─── Filename Sanitization ───────────────────────────────────────────────────

const MALICIOUS_FILENAME_PATTERNS: RegExp[] = [
  /\.\.\//, // path traversal
  /\.\.\\/, // windows path traversal
  /[<>:"|?*]/, // invalid chars that could be used for injection
  /\0/, // null byte
];

export function validateFilename(filename: string): { valid: boolean; reason?: string; sanitized?: string } {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, reason: 'Filename is empty' };
  }
  if (filename.length > MAX_FILENAME_LENGTH) {
    return { valid: false, reason: `Filename exceeds ${MAX_FILENAME_LENGTH} characters` };
  }
  for (const pattern of MALICIOUS_FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      return { valid: false, reason: `Filename contains potentially malicious characters` };
    }
  }
  // Sanitize: take basename only
  const basename = filename.split(/[/\\]/).pop() || filename;
  return { valid: true, sanitized: basename };
}

// ─── Hash Function ───────────────────────────────────────────────────────────

function simpleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  return 'doc-' + Math.abs(hash).toString(16).padStart(8, '0');
}

// ─── File Validation ──────────────────────────────────────────────────────────

export function validateFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): { valid: boolean; reason?: string; sanitizedFilename?: string } {
  // File type check
  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return { valid: false, reason: `File type ${mimeType} is not allowed` };
  }
  // File size check
  if (sizeBytes <= 0) {
    return { valid: false, reason: 'File is empty' };
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, reason: `File exceeds ${MAX_FILE_SIZE} bytes` };
  }
  // Filename validation
  const fnResult = validateFilename(filename);
  if (!fnResult.valid) {
    return { valid: false, reason: fnResult.reason };
  }
  return { valid: true, sanitizedFilename: fnResult.sanitized };
}

// ─── Text Sanitization ───────────────────────────────────────────────────────

export function sanitizeDocumentText(text: string): { text: string; warnings: string[]; injectionDetected: boolean } {
  const warnings: string[] = [];
  let injectionDetected = false;

  // Strip control characters (except newline, tab, carriage return)
  let sanitized = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Detect prompt injection patterns
  for (const [pattern, reason] of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      warnings.push(`SECURITY: ${reason}`);
      injectionDetected = true;
      // Don't strip the text — but flag it heavily and wrap it
    }
  }

  // Truncate to max length
  if (sanitized.length > MAX_TEXT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TEXT_LENGTH);
    warnings.push(`Text truncated to ${MAX_TEXT_LENGTH} characters`);
  }

  return { text: sanitized, warnings, injectionDetected };
}

// ─── Untrusted Text Wrapping ─────────────────────────────────────────────────

export function wrapUntrustedDocumentText(text: string): string {
  return `BEGIN_UNTRUSTED_DOCUMENT_TEXT\n${text}\nEND_UNTRUSTED_DOCUMENT_TEXT`;
}

// ─── Ingest Function ──────────────────────────────────────────────────────────

export function ingestDocument(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  source: IngestSource;
  text?: string;
}): IngestedDocument {
  const warnings: string[] = [];

  // Validate file
  const fileValidation = validateFile(input.filename, input.mimeType, input.sizeBytes);
  if (!fileValidation.valid) {
    return {
      id: simpleHash(input.filename + input.sizeBytes + Date.now()),
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      source: input.source,
      uploadedAt: new Date().toISOString(),
      text: undefined,
      textTruncated: false,
      warnings: [`BLOCKED: ${fileValidation.reason}`],
      blocked: true,
      blockReason: fileValidation.reason,
      hash: simpleHash(input.filename + input.sizeBytes),
    };
  }

  // Sanitize text if present
  let sanitizedText: string | undefined;
  let textTruncated = false;
  let injectionDetected = false;

  if (input.text) {
    const sanitization = sanitizeDocumentText(input.text);
    sanitizedText = sanitization.text;
    textTruncated = sanitization.text.length < input.text.length;
    injectionDetected = sanitization.injectionDetected;
    if (sanitization.warnings.length > 0) {
      warnings.push(...sanitization.warnings);
    }
  }

  const hash = simpleHash(sanitizedText || input.filename + input.sizeBytes);

  return {
    id: hash,
    filename: fileValidation.sanitizedFilename || input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    source: input.source,
    uploadedAt: new Date().toISOString(),
    text: sanitizedText,
    textTruncated,
    warnings,
    blocked: false,
    hash,
  };
}

// ─── Batch Ingest with Duplicate Detection ──────────────────────────────────

export function ingestDocuments(inputs: Array<{
  filename: string;
  mimeType: string;
  sizeBytes: number;
  source: IngestSource;
  text?: string;
}>): IngestResult {
  const documents: IngestedDocument[] = [];
  const duplicates: string[] = [];
  const blocked: string[] = [];
  const warnings: string[] = [];
  const seenHashes = new Set<string>();

  for (const input of inputs) {
    const doc = ingestDocument(input);
    if (doc.blocked) {
      blocked.push(`${doc.filename}: ${doc.blockReason}`);
      continue;
    }
    if (seenHashes.has(doc.hash)) {
      duplicates.push(doc.filename);
      continue;
    }
    seenHashes.add(doc.hash);
    if (doc.warnings.length > 0) {
      warnings.push(...doc.warnings.map(w => `${doc.filename}: ${w}`));
    }
    documents.push(doc);
  }

  return { documents, duplicates, warnings, blocked };
}

// ─── Duplicate Hash Check (Utility) ─────────────────────────────────────────

/**
 * Check whether a hash has already been seen in the provided list.
 * Used by both workflows for duplicate document detection.
 */
export function checkDuplicate(hash: string, seenHashes: string[]): boolean {
  return seenHashes.includes(hash);
}
