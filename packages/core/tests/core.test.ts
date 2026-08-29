import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createId,
  confidence,
  ok,
  err,
  unwrap,
  mapResult,
  PlatformError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
  SecurityError,
  validateNonEmpty,
  validateRange,
  validateOneOf,
  validateMaxLength,
  toISODate,
  parseISODate,
  daysBetween,
  addDays,
  isFuture,
  isPast,
  createConfig,
  noopLogger,
  withRetry,
  isRetryableError,
} from "../src/index.js";

// ── Branded Types ─────────────────────────────────────────────────────────────

describe("Branded Types", () => {
  test("createId creates a PlatformId", () => {
    const id = createId("abc123");
    assert.equal(id, "abc123");
  });

  test("createId throws on empty string", () => {
    assert.throws(() => createId(""), /cannot be empty/);
    assert.throws(() => createId("   "), /cannot be empty/);
  });

  test("confidence creates a Confidence value", () => {
    assert.equal(confidence(0), 0);
    assert.equal(confidence(0.5), 0.5);
    assert.equal(confidence(1), 1);
  });

  test("confidence throws on invalid values", () => {
    assert.throws(() => confidence(-0.1), /between 0 and 1/);
    assert.throws(() => confidence(1.1), /between 0 and 1/);
    assert.throws(() => confidence(NaN), /between 0 and 1/);
    assert.throws(() => confidence(Infinity), /between 0 and 1/);
  });
});

// ── Result Type ───────────────────────────────────────────────────────────────

describe("Result", () => {
  test("ok creates a successful result", () => {
    const r = ok(42);
    assert.equal(r.ok, true);
    assert.equal((r as { value: number }).value, 42);
  });

  test("err creates a failure result", () => {
    const r = err(new ValidationError("bad"));
    assert.equal(r.ok, false);
    assert.ok((r as { error: Error }).error instanceof ValidationError);
  });

  test("unwrap returns value for ok", () => {
    assert.equal(unwrap(ok("hello")), "hello");
  });

  test("unwrap throws for err", () => {
    assert.throws(() => unwrap(err(new ValidationError("bad"))), /bad/);
  });

  test("mapResult transforms ok value", () => {
    const r = mapResult(ok(5), (n) => n * 2);
    assert.equal(r.ok, true);
    assert.equal((r as { value: number }).value, 10);
  });

  test("mapResult passes through err", () => {
    const e = new ValidationError("bad");
    const r = mapResult(err(e), (_n: number) => 0);
    assert.equal(r.ok, false);
    assert.equal((r as { error: Error }).error, e);
  });
});

// ── Typed Errors ──────────────────────────────────────────────────────────────

describe("Typed Errors", () => {
  test("PlatformError has category and code", () => {
    const e = new PlatformError("msg", { category: "internal", code: "TEST" });
    assert.equal(e.category, "internal");
    assert.equal(e.code, "TEST");
    assert.equal(e.retryable, false);
  });

  test("ValidationError has correct category", () => {
    const e = new ValidationError("bad input");
    assert.equal(e.category, "validation");
    assert.equal(e.code, "VALIDATION_ERROR");
    assert.equal(e.retryable, false);
  });

  test("NotFoundError has correct category", () => {
    const e = new NotFoundError("not here");
    assert.equal(e.category, "not_found");
  });

  test("RateLimitError is retryable", () => {
    const e = new RateLimitError("slow down");
    assert.equal(e.retryable, true);
  });

  test("UpstreamError is retryable", () => {
    const e = new UpstreamError("provider down");
    assert.equal(e.retryable, true);
  });

  test("SecurityError has correct category", () => {
    const e = new SecurityError("bad actor");
    assert.equal(e.category, "security");
  });

  test("Errors carry details", () => {
    const e = new ValidationError("bad", { field: "name" });
    assert.deepEqual(e.details, { field: "name" });
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("Validation", () => {
  test("validateNonEmpty passes for non-empty", () => {
    assert.equal(validateNonEmpty("hello", "name").ok, true);
  });

  test("validateNonEmpty fails for empty", () => {
    const r = validateNonEmpty("", "name");
    assert.equal(r.ok, false);
    assert.match((r as { error: Error }).error.message, /name must not be empty/);
  });

  test("validateRange passes within bounds", () => {
    assert.equal(validateRange(5, "count", 1, 10).ok, true);
  });

  test("validateRange fails outside bounds", () => {
    assert.equal(validateRange(0, "count", 1, 10).ok, false);
    assert.equal(validateRange(11, "count", 1, 10).ok, false);
  });

  test("validateOneOf passes for valid value", () => {
    assert.equal(validateOneOf("a", "letter", ["a", "b", "c"]).ok, true);
  });

  test("validateOneOf fails for invalid value", () => {
    assert.equal(validateOneOf("d", "letter", ["a", "b", "c"]).ok, false);
  });

  test("validateMaxLength passes within limit", () => {
    assert.equal(validateMaxLength("hi", "name", 10).ok, true);
  });

  test("validateMaxLength fails exceeding limit", () => {
    assert.equal(validateMaxLength("hello world", "name", 5).ok, false);
  });
});

// ── Date/Time Utilities ───────────────────────────────────────────────────────

describe("Date/Time", () => {
  test("toISODate produces ISO string", () => {
    const d = new Date("2026-01-15T10:00:00Z");
    assert.equal(toISODate(d), "2026-01-15T10:00:00.000Z");
  });

  test("parseISODate succeeds for valid date", () => {
    const r = parseISODate("2026-01-15");
    assert.equal(r.ok, true);
  });

  test("parseISODate fails for invalid date", () => {
    const r = parseISODate("not-a-date");
    assert.equal(r.ok, false);
  });

  test("daysBetween computes correct difference", () => {
    const r = daysBetween("2026-01-01", "2026-01-15");
    assert.equal(r.ok, true);
    assert.equal((r as { value: number }).value, 14);
  });

  test("addDays adds days correctly", () => {
    const r = addDays("2026-01-01", 10);
    assert.equal(r.ok, true);
    assert.match((r as { value: string }).value, /2026-01-11/);
  });

  test("isFuture returns true for future date", () => {
    assert.equal(isFuture("2099-01-01"), true);
  });

  test("isPast returns true for past date", () => {
    assert.equal(isPast("2000-01-01"), true);
  });
});

// ── Config ─────────────────────────────────────────────────────────────────────

describe("Config", () => {
  test("get returns value", () => {
    const config = createConfig({ KEY: "value" });
    assert.equal(config.get("KEY"), "value");
  });

  test("get returns undefined for missing", () => {
    const config = createConfig({});
    assert.equal(config.get("MISSING"), undefined);
  });

  test("require throws for missing", () => {
    const config = createConfig({});
    assert.throws(() => config.require("MISSING"), /not set/);
  });

  test("getBoolean parses true values", () => {
    const config = createConfig({ A: "true", B: "1", C: "yes", D: "false" });
    assert.equal(config.getBoolean("A"), true);
    assert.equal(config.getBoolean("B"), true);
    assert.equal(config.getBoolean("C"), true);
    assert.equal(config.getBoolean("D"), false);
  });

  test("getNumber parses numeric values", () => {
    const config = createConfig({ PORT: "3000" });
    assert.equal(config.getNumber("PORT"), 3000);
  });

  test("getNumber returns undefined for non-numeric", () => {
    const config = createConfig({ PORT: "abc" });
    assert.equal(config.getNumber("PORT"), undefined);
  });
});

// ── Logger ────────────────────────────────────────────────────────────────────

describe("Logger", () => {
  test("noopLogger does not throw", () => {
    assert.doesNotThrow(() => noopLogger.info("test"));
    assert.doesNotThrow(() => noopLogger.debug("test", { x: 1 }));
    assert.doesNotThrow(() => noopLogger.warn("test"));
    assert.doesNotThrow(() => noopLogger.error("test"));
  });
});

// ── Retry ─────────────────────────────────────────────────────────────────────

describe("withRetry", () => {
  test("returns value on first success", async () => {
    const result = await withRetry(() => Promise.resolve("ok"));
    assert.equal(result, "ok");
  });

  test("retries on retryable error", async () => {
    let attempts = 0;
    const result = await withRetry(
      () => {
        attempts++;
        if (attempts < 3) {
          throw new UpstreamError("temporary failure");
        }
        return Promise.resolve("ok");
      },
      { baseDelayMs: 1, maxDelayMs: 10 },
    );
    assert.equal(result, "ok");
    assert.equal(attempts, 3);
  });

  test("does not retry on non-retryable error", async () => {
    let attempts = 0;
    await assert.rejects(
      withRetry(
        () => {
          attempts++;
          throw new ValidationError("permanent failure");
        },
        { baseDelayMs: 1 },
      ),
    );
    assert.equal(attempts, 1);
  });

  test("calls onRetry callback", async () => {
    const retries: number[] = [];
    let attempts = 0;
    await withRetry(
      () => {
        attempts++;
        if (attempts < 2) throw new UpstreamError("fail");
        return Promise.resolve("ok");
      },
      {
        baseDelayMs: 1,
        onRetry: (info) => retries.push(info.attempt),
      },
    );
    assert.equal(retries.length, 1);
    assert.equal(retries[0], 1);
  });

  test("isRetryableError detects retryable PlatformErrors", () => {
    assert.equal(isRetryableError(new UpstreamError("fail")), true);
    assert.equal(isRetryableError(new RateLimitError("slow")), true);
    assert.equal(isRetryableError(new ValidationError("bad")), false);
  });
});
