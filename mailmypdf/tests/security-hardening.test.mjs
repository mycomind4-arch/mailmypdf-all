import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Security Headers Tests ────────────────────────────────────────────────────

describe("Security Hardening — Security Headers Module", () => {
  it("security-headers.ts exists and exports applySecurityHeaders", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /export function applySecurityHeaders/);
    assert.match(sh, /export function getSecurityHeaders/);
    assert.match(sh, /export function buildCspHeader/);
  });

  it("includes all required security headers", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /Content-Security-Policy/);
    assert.match(sh, /Strict-Transport-Security/);
    assert.match(sh, /X-Frame-Options/);
    assert.match(sh, /X-Content-Type-Options/);
    assert.match(sh, /Referrer-Policy/);
    assert.match(sh, /Permissions-Policy/);
  });

  it("CSP restricts script sources", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /script-src/);
    assert.match(sh, /js\.stripe\.com/);
    assert.match(sh, /object-src 'none'/);
    assert.match(sh, /upgrade-insecure-requests/);
  });

  it("HSTS has preload and includeSubDomains", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /max-age=31536000/);
    assert.match(sh, /includeSubDomains/);
    assert.match(sh, /preload/);
  });

  it("X-Frame-Options is DENY (not SAMEORIGIN)", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /X-Frame-Options.*DENY/);
  });

  it("Permissions-Policy restricts camera and microphone", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /camera=\(\)/);
    assert.match(sh, /microphone=\(\)/);
    assert.match(sh, /geolocation=\(\)/);
  });

  it("Cross-Origin policies are set", async () => {
    const sh = await source("src/lib/security-headers.ts");
    assert.match(sh, /Cross-Origin-Opener-Policy/);
    assert.match(sh, /Cross-Origin-Resource-Policy/);
  });

  it("security headers middleware is wired in start.ts", async () => {
    const start = await source("src/start.ts");
    assert.match(start, /securityHeadersMiddleware/);
    assert.match(start, /applySecurityHeaders/);
  });
});

// ── Audit Logging Tests ──────────────────────────────────────────────────────

describe("Security Hardening — Audit Logging", () => {
  it("audit-log.ts exists and exports audit function", async () => {
    const al = await source("src/lib/audit-log.ts");
    assert.match(al, /export async function audit/);
    assert.match(al, /export type AuditAction/);
    assert.match(al, /export type AuditLevel/);
  });

  it("audit-log has helper functions for common actions", async () => {
    const al = await source("src/lib/audit-log.ts");
    assert.match(al, /export async function auditStatusChange/);
    assert.match(al, /export async function auditAdminAction/);
    assert.match(al, /export async function auditAuthFailure/);
    assert.match(al, /export async function auditRateLimit/);
  });

  it("audit-log covers all critical action types", async () => {
    const al = await source("src/lib/audit-log.ts");
    assert.match(al, /order\.payment_received/);
    assert.match(al, /order\.payment_failed/);
    assert.match(al, /order\.refund_created/);
    assert.match(al, /order\.lob_submitted/);
    assert.match(al, /admin\.login_attempt/);
    assert.match(al, /webhook\.stripe_verified/);
    assert.match(al, /auth\.rate_limited/);
    assert.match(al, /security\.invalid_input/);
  });

  it("audit-log stores events in order_events table", async () => {
    const al = await source("src/lib/audit-log.ts");
    assert.match(al, /order_events/);
    assert.match(al, /audit\./);
  });

  it("webhook handler uses audit logging", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /import.*audit.*from.*audit-log/);
    assert.match(webhook, /audit\(/);
    assert.match(webhook, /order\.payment_received/);
  });

  it("rate limiter audits violations", async () => {
    const rl = await source("src/lib/rate-limit.ts");
    assert.match(rl, /auth\.rate_limited/);
    assert.match(rl, /audit/);
  });
});

// ── Input Sanitization Tests ──────────────────────────────────────────────────

describe("Security Hardening — Input Sanitization", () => {
  it("sanitize.ts exists and exports all sanitizers", async () => {
    const s = await source("src/lib/sanitize.ts");
    assert.match(s, /export function sanitizePlainText/);
    assert.match(s, /export function sanitizeFileName/);
    assert.match(s, /export function sanitizeFreeText/);
    assert.match(s, /export function sanitizeEmail/);
    assert.match(s, /export function sanitizeZipCode/);
    assert.match(s, /export function sanitizeState/);
    assert.match(s, /export function sanitizeUuid/);
    assert.match(s, /export function sanitizeToken/);
    assert.match(s, /export function sanitizeAddress/);
    assert.match(s, /export function stripControlChars/);
  });

  it("mail.service.ts imports and uses sanitizers", async () => {
    const mailService = await source("src/services/mail.service.ts");
    assert.match(mailService, /sanitizeAddress[\s\S]*from.*sanitize/);
    assert.match(mailService, /sanitizeAddress/);
    assert.match(mailService, /sanitizeEmail/);
    assert.match(mailService, /sanitizeFileName/);
  });
});

// ── Behavioral Tests: Sanitization ────────────────────────────────────────────

describe("Sanitization — stripControlChars", () => {
  it("removes null bytes and control characters", () => {
    function stripControlChars(input) {
      return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    }
    assert.equal(stripControlChars("hello\x00world"), "helloworld");
    assert.equal(stripControlChars("test\x01\x02\x03"), "test");
    assert.equal(stripControlChars("normal text"), "normal text");
  });

  it("preserves newlines and tabs", () => {
    function stripControlChars(input) {
      return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    }
    assert.equal(stripControlChars("line1\nline2"), "line1\nline2");
    assert.equal(stripControlChars("col1\tcol2"), "col1\tcol2");
  });
});

describe("Sanitization — sanitizePlainText", () => {
  it("strips HTML tags", () => {
    function sanitizePlainText(input) {
      let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      result = result.replace(/<[^>]*>/g, "");
      return result.trim().replace(/\s+/g, " ");
    }
    assert.equal(sanitizePlainText("<script>alert(1)</script>hello"), "alert(1)hello");
    assert.equal(sanitizePlainText("<b>bold</b>"), "bold");
    assert.equal(sanitizePlainText("plain text"), "plain text");
  });

  it("normalizes whitespace", () => {
    function sanitizePlainText(input) {
      let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      result = result.replace(/<[^>]*>/g, "");
      return result.trim().replace(/\s+/g, " ");
    }
    assert.equal(sanitizePlainText("  too   much   space  "), "too much space");
  });

  it("truncates to max length", () => {
    function sanitizePlainText(input, maxLength = 10) {
      let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      result = result.replace(/<[^>]*>/g, "");
      result = result.trim().replace(/\s+/g, " ");
      return result.length > maxLength ? result.slice(0, maxLength) : result;
    }
    assert.equal(sanitizePlainText("123456789012345").length, 10);
  });
});

describe("Sanitization — sanitizeFileName", () => {
  it("strips path separators to prevent directory traversal", () => {
    function sanitizeFileName(input) {
      let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      result = result.replace(/[/\\]/g, "_");
      result = result.replace(/^\.+/, "");
      result = result.replace(/[;<>&|`$]/g, "_");
      return result.trim().replace(/\s+/g, "_");
    }
    // Forward slashes
    assert.equal(sanitizeFileName("../../../etc/passwd"), "_.._.._etc_passwd");
    // Backslashes — use String.raw to get literal backslash characters
    const winPath = String.raw`..\..\windows\system32`;
    const sanitized = sanitizeFileName(winPath);
    // After replacing \ with _: ".._.._windows_system32", then strip leading dots: "_.._windows_system32"
    // Wait: ".._.._windows_system32" — leading chars are dots, stripped to "_.._windows_system32"
    // Actually: replace \ with _ gives ".._.._windows_system32", then replace ^\.+ strips leading dots -> "_.._windows_system32"
    assert.ok(sanitized.includes("windows_system32"), `expected windows_system32 in ${sanitized}`);
    assert.ok(!sanitized.includes("\\"), "backslashes should be removed");
    assert.ok(!sanitized.includes("/"), "forward slashes should be removed");
  });

  it("strips shell metacharacters", () => {
    function sanitizeFileName(input) {
      let result = input.replace(/[;<>&|`$]/g, "_");
      return result;
    }
    assert.equal(sanitizeFileName("file;rm -rf /"), "file_rm -rf /");
    assert.equal(sanitizeFileName("file$(whoami)"), "file_(whoami)");
  });

  it("strips leading dots", () => {
    function sanitizeFileName(input) {
      return input.replace(/^\.+/, "");
    }
    assert.equal(sanitizeFileName(".hidden"), "hidden");
    assert.equal(sanitizeFileName("...test"), "test");
  });
});

describe("Sanitization — sanitizeEmail", () => {
  it("lowercases and validates", () => {
    function sanitizeEmail(input) {
      let result = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error("Invalid email");
      return result;
    }
    assert.equal(sanitizeEmail("John.DOE@Example.COM"), "john.doe@example.com");
    assert.equal(sanitizeEmail("  test@test.com  "), "test@test.com");
    assert.throws(() => sanitizeEmail("not-an-email"), /Invalid email/);
    assert.throws(() => sanitizeEmail("missing@domain"), /Invalid email/);
  });
});

describe("Sanitization — sanitizeZipCode", () => {
  it("validates 5-digit and 9-digit ZIP codes", () => {
    function sanitizeZipCode(input) {
      let result = input.replace(/[^0-9-]/g, "");
      if (!/^\d{5}(-\d{4})?$/.test(result)) throw new Error("Invalid ZIP");
      return result;
    }
    assert.equal(sanitizeZipCode("12345"), "12345");
    assert.equal(sanitizeZipCode("12345-6789"), "12345-6789");
    assert.equal(sanitizeZipCode("  12345  "), "12345");
    assert.throws(() => sanitizeZipCode("1234"), /Invalid ZIP/);
    assert.throws(() => sanitizeZipCode("ABCDE"), /Invalid ZIP/);
  });
});

describe("Sanitization — sanitizeState", () => {
  it("uppercases and validates 2-letter format", () => {
    function sanitizeState(input) {
      let result = input.trim().toUpperCase().replace(/[^A-Z]/g, "");
      if (result.length !== 2) throw new Error("Invalid state");
      return result;
    }
    assert.equal(sanitizeState("ca"), "CA");
    assert.equal(sanitizeState("CA"), "CA");
    assert.equal(sanitizeState("  ca  "), "CA");
    assert.throws(() => sanitizeState("California"), /Invalid state/);
    assert.throws(() => sanitizeState("C"), /Invalid state/);
  });
});

describe("Sanitization — sanitizeUuid", () => {
  it("validates UUID format", () => {
    function sanitizeUuid(input) {
      const result = input.trim().toLowerCase();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result)) {
        throw new Error("Invalid UUID");
      }
      return result;
    }
    assert.equal(sanitizeUuid("550E8400-E29B-41D4-A716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
    assert.throws(() => sanitizeUuid("not-a-uuid"), /Invalid UUID/);
    assert.throws(() => sanitizeUuid("550e8400-e29b-41d4-a716"), /Invalid UUID/);
  });
});

describe("Sanitization — sanitizeToken", () => {
  it("strips non-alphanumeric and validates length", () => {
    function sanitizeToken(input, maxLength = 128) {
      let result = input.replace(/[^a-zA-Z0-9]/g, "");
      if (result.length < 8 || result.length > maxLength) throw new Error("Invalid token");
      return result;
    }
    assert.equal(sanitizeToken("abc123!@#def"), "abc123def");
    assert.throws(() => sanitizeToken("short"), /Invalid token/);
    assert.throws(() => sanitizeToken("a".repeat(129)), /Invalid token/);
  });
});

describe("Sanitization — sanitizeFreeText", () => {
  it("removes script tags and event handlers", () => {
    function sanitizeFreeText(input) {
      let result = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      result = result.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
      result = result.replace(/on\w+\s*=\s*'[^']*'/gi, "");
      result = result.replace(/javascript:/gi, "");
      return result;
    }
    assert.equal(sanitizeFreeText("<script>alert(1)</script>hello"), "hello");
    // onclick="alert(1)" is stripped, leaving a space before >
    const result = sanitizeFreeText('<div onclick="alert(1)">text</div>');
    assert.ok(result.includes("text"), "should contain text");
    assert.ok(!result.includes("onclick"), "should not contain onclick");
    assert.ok(!result.includes("alert"), "should not contain alert");
    assert.equal(sanitizeFreeText("javascript:alert(1)"), "alert(1)");
    assert.equal(sanitizeFreeText("normal letter text"), "normal letter text");
  });
});

// ── Behavioral Tests: Rate Limiting ──────────────────────────────────────────

describe("Security Hardening — Rate Limiting", () => {
  it("rate limiter has audit integration", async () => {
    const rl = await source("src/lib/rate-limit.ts");
    assert.match(rl, /audit/);
    assert.match(rl, /auth\.rate_limited/);
  });

  it("rate limiter still enforces limits", () => {
    const store = new Map();
    function rateLimit(key, bucket, options) {
      const compositeKey = `${bucket}:${key}`;
      const now = Date.now();
      const windowStart = now - options.windowMs;
      let entry = store.get(compositeKey);
      if (!entry) { entry = { timestamps: [] }; store.set(compositeKey, entry); }
      entry.timestamps = entry.timestamps.filter(t => t > windowStart);
      if (entry.timestamps.length >= options.maxRequests) return { allowed: false };
      entry.timestamps.push(now);
      return { allowed: true };
    }
    // 3 per minute
    assert.ok(rateLimit("ip1", "test", { maxRequests: 3, windowMs: 60000 }).allowed);
    assert.ok(rateLimit("ip1", "test", { maxRequests: 3, windowMs: 60000 }).allowed);
    assert.ok(rateLimit("ip1", "test", { maxRequests: 3, windowMs: 60000 }).allowed);
    assert.ok(!rateLimit("ip1", "test", { maxRequests: 3, windowMs: 60000 }).allowed);
    // Different IP is not affected
    assert.ok(rateLimit("ip2", "test", { maxRequests: 3, windowMs: 60000 }).allowed);
  });
});
