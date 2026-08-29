import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Platform Core Tests ──────────────────────────────────────────────────────

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
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
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
  createSaveStatus,
  transitioning,
  type SaveStatus,
} from "../src/lib/platform/core";

describe("Platform Core", () => {
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
    });
  });

  describe("Result Type", () => {
    test("ok creates a successful result", () => {
      const r = ok(42);
      assert.equal(r.ok, true);
      assert.equal((r as { value: number }).value, 42);
    });

    test("err creates a failure result", () => {
      const r = err(new ValidationError("bad"));
      assert.equal(r.ok, false);
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
  });

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
    });

    test("NotFoundError has correct category", () => {
      const e = new NotFoundError("not here");
      assert.equal(e.category, "not_found");
    });

    test("UnauthorizedError has correct category", () => {
      const e = new UnauthorizedError("no access");
      assert.equal(e.category, "unauthorized");
    });

    test("ForbiddenError has correct category", () => {
      const e = new ForbiddenError("forbidden");
      assert.equal(e.category, "forbidden");
    });

    test("ConflictError has correct category", () => {
      const e = new ConflictError("conflict");
      assert.equal(e.category, "conflict");
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
  });

  describe("Validation", () => {
    test("validateNonEmpty passes for non-empty", () => {
      assert.equal(validateNonEmpty("hello", "name").ok, true);
    });

    test("validateNonEmpty fails for empty", () => {
      const r = validateNonEmpty("", "name");
      assert.equal(r.ok, false);
    });

    test("validateRange passes within bounds", () => {
      assert.equal(validateRange(5, "count", 1, 10).ok, true);
    });

    test("validateRange fails outside bounds", () => {
      assert.equal(validateRange(0, "count", 1, 10).ok, false);
      assert.equal(validateRange(11, "count", 1, 10).ok, false);
    });

    test("validateMaxLength passes within limit", () => {
      assert.equal(validateMaxLength("hi", "name", 10).ok, true);
    });

    test("validateMaxLength fails exceeding limit", () => {
      assert.equal(validateMaxLength("hello world", "name", 5).ok, false);
    });
  });

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

  describe("Retry", () => {
    test("returns value on first success", async () => {
      const result = await withRetry(() => Promise.resolve("ok"));
      assert.equal(result, "ok");
    });

    test("retries on retryable error", async () => {
      let attempts = 0;
      const result = await withRetry(
        () => {
          attempts++;
          if (attempts < 3) throw new UpstreamError("temporary failure");
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
        withRetry(() => {
          attempts++;
          throw new ValidationError("permanent failure");
        }, { baseDelayMs: 1 }),
      );
      assert.equal(attempts, 1);
    });

    test("isRetryableError detects retryable PlatformErrors", () => {
      assert.equal(isRetryableError(new UpstreamError("fail")), true);
      assert.equal(isRetryableError(new RateLimitError("slow")), true);
      assert.equal(isRetryableError(new ValidationError("bad")), false);
    });
  });

  describe("Save State", () => {
    test("createSaveStatus starts idle", () => {
      const status = createSaveStatus();
      assert.equal(status.state, "idle");
      assert.equal(status.retryCount, 0);
    });

    test("transitioning to saving resets retry count", () => {
      const status = createSaveStatus();
      const saving = transitioning(status, "saving");
      assert.equal(saving.state, "saving");
      assert.equal(saving.retryCount, 0);
    });

    test("transitioning to saved records timestamp", () => {
      const status = createSaveStatus();
      const saved = transitioning(status, "saved");
      assert.equal(saved.state, "saved");
      assert.ok(saved.lastSavedAt);
    });

    test("transitioning to failed preserves error", () => {
      const status = createSaveStatus();
      const failed = transitioning(status, "failed", "Connection error");
      assert.equal(failed.state, "failed");
      assert.equal(failed.error, "Connection error");
    });

    test("transitioning to retrying increments count", () => {
      let status = createSaveStatus();
      status = transitioning(status, "failed", "error");
      status = transitioning(status, "retrying");
      assert.equal(status.retryCount, 1);
      status = transitioning(status, "failed", "error");
      status = transitioning(status, "retrying");
      assert.equal(status.retryCount, 2);
    });
  });
});
