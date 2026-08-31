/**
 * Input sanitization utilities for user-provided content.
 *
 * MailMyPDF accepts user input in several places:
 * - Email addresses (order creation, checkout)
 * - Postal addresses (sender, recipient)
 * - File names (PDF upload)
 * - Free-text fields (letter editor)
 * - Query parameters (order lookup tokens)
 *
 * This module provides safe sanitization functions that:
 * - Strip control characters and null bytes
 * - Enforce max length
 * - Remove HTML/script tags from plain-text fields
 * - Normalize whitespace
 * - Validate format (email, UUID, ZIP code)
 *
 * Sanitization is defense-in-depth on top of Zod schema validation.
 * Zod catches invalid input; sanitizers clean it before storage.
 */

/**
 * Strip control characters (except newline/tab) and null bytes.
 * Prevents log injection and storage corruption.
 */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize a plain-text field (name, address line, city, etc.)
 * - Strips control characters
 * - Removes HTML tags (prevents stored XSS if rendered)
 * - Normalizes whitespace
 * - Truncates to max length
 */
export function sanitizePlainText(input: string, maxLength = 200): string {
  let result = stripControlChars(input);
  // Remove HTML tags — fields are plain text, never HTML
  result = result.replace(/<[^>]*>/g, "");
  // Normalize whitespace
  result = result.trim().replace(/\s+/g, " ");
  // Truncate
  if (result.length > maxLength) result = result.slice(0, maxLength);
  return result;
}

/**
 * Sanitize a file name.
 * - Strips path separators (prevents directory traversal)
 * - Strips control characters
 * - Removes shell metacharacters
 * - Enforces length limit
 * - Preserves file extension
 */
export function sanitizeFileName(input: string, maxLength = 200): string {
  let result = stripControlChars(input);
  // Remove path separators — prevents directory traversal
  result = result.replace(/[/\\]/g, "_");
  // Remove leading dots (hidden files)
  result = result.replace(/^\.+/, "");
  // Remove shell metacharacters
  result = result.replace(/[;<>&|`$]/g, "_");
  // Normalize whitespace
  result = result.trim().replace(/\s+/g, "_");
  // Truncate (preserve extension if possible)
  if (result.length > maxLength) {
    const ext = result.match(/\.([a-zA-Z0-9]{1,10})$/);
    if (ext) {
      const extStr = ext[0];
      result = result.slice(0, maxLength - extStr.length) + extStr;
    } else {
      result = result.slice(0, maxLength);
    }
  }
  return result;
}

/**
 * Sanitize a free-text field (letter content, notes, etc.)
 * - Strips control characters (keeps newlines for letter formatting)
 * - Removes script tags and event handlers
 * - Does NOT remove all HTML (letters may contain intended formatting)
 * - Enforces length limit
 */
export function sanitizeFreeText(input: string, maxLength = 20_000): string {
  let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Remove script tags and event handlers
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  result = result.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
  result = result.replace(/on\w+\s*=\s*'[^']*'/gi, "");
  result = result.replace(/javascript:/gi, "");
  // Truncate
  if (result.length > maxLength) result = result.slice(0, maxLength);
  return result;
}

/**
 * Sanitize an email address.
 * - Lowercases
 * - Strips whitespace and control characters
 * - Validates format
 */
export function sanitizeEmail(input: string): string {
  let result = stripControlChars(input).trim().toLowerCase();
  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new Error("Invalid email address format");
  }
  if (result.length > 254) {
    throw new Error("Email address too long");
  }
  return result;
}

/**
 * Sanitize a ZIP code.
 * - Strips non-numeric and non-hyphen characters
 * - Validates format (5 digits or 5+4)
 */
export function sanitizeZipCode(input: string): string {
  let result = stripControlChars(input).trim();
  result = result.replace(/[^0-9-]/g, "");
  if (!/^\d{5}(-\d{4})?$/.test(result)) {
    throw new Error("Invalid ZIP code format");
  }
  return result;
}

/**
 * Sanitize a state abbreviation.
 * - Uppercases
 * - Strips non-alpha
 * - Validates 2-letter format
 */
export function sanitizeState(input: string): string {
  let result = stripControlChars(input).trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (result.length !== 2) {
    throw new Error("State must be a 2-letter abbreviation");
  }
  return result;
}

/**
 * Sanitize a UUID.
 * - Strips non-hex/non-hyphen characters
 * - Validates format
 */
export function sanitizeUuid(input: string): string {
  const result = stripControlChars(input).trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result)) {
    throw new Error("Invalid UUID format");
  }
  return result;
}

/**
 * Sanitize a lookup token.
 * - Strips non-alphanumeric characters
 * - Enforces length
 */
export function sanitizeToken(input: string, maxLength = 128): string {
  let result = stripControlChars(input).trim();
  result = result.replace(/[^a-zA-Z0-9]/g, "");
  if (result.length < 8 || result.length > maxLength) {
    throw new Error("Invalid token format");
  }
  return result;
}

/**
 * Sanitize a postal address object.
 */
export function sanitizeAddress(addr: {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}): {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
} {
  return {
    name: sanitizePlainText(addr.name, 120),
    line1: sanitizePlainText(addr.line1, 200),
    line2: addr.line2 ? sanitizePlainText(addr.line2, 200) : null,
    city: sanitizePlainText(addr.city, 100),
    state: sanitizeState(addr.state),
    postalCode: sanitizeZipCode(addr.postalCode),
  };
}
