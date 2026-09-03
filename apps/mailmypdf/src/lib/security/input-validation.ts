/**
 * Comprehensive Input Validation
 *
 * Centralized validation for all user inputs across MailMyPDF.
 * Prevents SQL injection, XSS, command injection, and other attacks.
 */

import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────── */
/* VALIDATION SCHEMAS                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Common field validators
 */
export const CommonSchemas = {
  // UUID validation
  uuid: z.string().uuid("Invalid UUID format"),

  // Email validation
  email: z.string().email("Invalid email format").max(255),

  // URL validation (safe)
  url: z.string().url("Invalid URL format").max(2048),

  // Safe string (no SQL injection, XSS)
  safeString: z
    .string()
    .min(1)
    .max(1000)
    .refine(
      (val) => !hasSQLInjection(val),
      "Input contains invalid characters"
    )
    .refine(
      (val) => !hasXSSVectors(val),
      "Input contains invalid characters"
    ),

  // Safe filename
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w\-. ]+$/, "Invalid filename format")
    .refine(
      (val) => !val.includes(".."),
      "Path traversal not allowed"
    ),

  // Slug (URL-safe identifier)
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9\-]+$/, "Invalid slug format"),

  // Phone number (basic)
  phone: z
    .string()
    .regex(/^[\d\-\+\(\)\s]+$/, "Invalid phone format")
    .min(10)
    .max(20),

  // Zip code
  zipCode: z
    .string()
    .regex(/^[\d\-]+$/, "Invalid zip code format")
    .min(5)
    .max(10),

  // Pagination
  limit: z.number().min(1).max(1000).default(25),
  offset: z.number().min(0).default(0),
};

/**
 * Workflow input validation
 */
export const WorkflowSchemas = {
  workflowId: CommonSchemas.uuid,
  workflowSlug: CommonSchemas.slug,

  searchQuery: z
    .string()
    .min(1)
    .max(200)
    .refine(
      (val) => !hasSQLInjection(val),
      "Invalid search query"
    ),

  category: z.enum([
    "government",
    "appeals",
    "disputes",
    "housing",
    "professional",
    "business",
    "personal",
    "legal",
    "financial",
    "taxes",
    "immigration",
    "records",
    "code-enforcement",
    "mail",
  ]),

  workflowStatus: z.enum([
    "draft",
    "in_progress",
    "submitted",
    "waiting_approval",
    "complete",
    "archived",
  ]),
};

/**
 * User input validation
 */
export const UserSchemas = {
  userId: CommonSchemas.uuid,
  email: CommonSchemas.email,
  name: CommonSchemas.safeString.max(100),
  phone: CommonSchemas.phone.optional(),
};

/**
 * Document validation
 */
export const DocumentSchemas = {
  documentId: CommonSchemas.uuid,
  documentName: CommonSchemas.filename,
  fileSize: z.number().max(50 * 1024 * 1024), // 50MB max
  mimeType: z.enum([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
};

/**
 * Payment/entitlement validation
 */
export const EntitlementSchemas = {
  amount: z.number().positive().max(999999.99),
  currency: z.enum(["USD", "EUR", "GBP"]),
  policyId: CommonSchemas.uuid.optional(),
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* INJECTION DETECTION                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Detect SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bEXEC\b)/i,
    /(\bALTER\b)/i,
    /('.*'.*')/,
    /(--.*)/,
    /(\/\*.*\*\/)/,
    /(xp_|sp_)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect XSS vectors
 */
export function hasXSSVectors(input: string): boolean {
  const xssPatterns = [
    /(<script[^>]*>.*?<\/script>)/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript:/gi,
    /(<iframe[^>]*>)/gi,
    /(<object[^>]*>)/gi,
    /(<embed[^>]*>)/gi,
    /(<img[^>]*on\w+)/gi,
    /(<svg[^>]*on\w+)/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect command injection patterns
 */
export function hasCommandInjection(input: string): boolean {
  const cmdPatterns = [
    /[;&|`$()]/,
    /\.\.\//,
    /\x00/,
  ];

  return cmdPatterns.some((pattern) => pattern.test(input));
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* VALIDATION UTILITIES                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Validate and parse input with schema
 */
export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      return { success: false, error: messages.join("; ") };
    }
    return { success: false, error: "Validation failed" };
  }
}

/**
 * Sanitize string input for safe display
 */
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize filename (remove path traversal attempts)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, "")
    .replace(/[^\w\-. ]/g, "")
    .substring(0, 255);
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate array doesn't exceed max length
 */
export function validateArrayLength<T>(
  arr: T[],
  maxLength: number
): boolean {
  return Array.isArray(arr) && arr.length <= maxLength;
}

/**
 * Validate request body size (bytes)
 */
export function validateRequestSize(
  contentLength: string | undefined,
  maxBytes: number = 10 * 1024 * 1024 // 10MB default
): boolean {
  if (!contentLength) return true;
  const bytes = parseInt(contentLength, 10);
  return !isNaN(bytes) && bytes <= maxBytes;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* VALIDATION MIDDLEWARE HELPERS                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Validate path parameter
 */
export function validatePathParam(
  param: unknown,
  paramName: string,
  schema: z.ZodSchema
): string {
  const result = validateInput(param, schema);
  if (!result.success) {
    throw new ValidationError(
      `Invalid path parameter '${paramName}': ${result.error}`
    );
  }
  return result.data as string;
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  params: Record<string, unknown>,
  schema: z.ZodSchema<T>
): T {
  const result = validateInput(params, schema);
  if (!result.success) {
    throw new ValidationError(`Invalid query parameters: ${result.error}`);
  }
  return result.data;
}

/**
 * Validate request body
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): T {
  const result = validateInput(body, schema);
  if (!result.success) {
    throw new ValidationError(`Invalid request body: ${result.error}`);
  }
  return result.data;
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
