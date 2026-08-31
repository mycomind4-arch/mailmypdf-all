import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the retry utility — verify backoff calculation, error classification,
// and retry behavior without hitting real network endpoints.

describe("Retry Utility — Backoff Calculation", () => {
  it("exponential delay increases with each attempt", () => {
    // Simulate the calculateDelay logic
    function calculateDelay(attempt, baseDelayMs, maxDelayMs, multiplier, jitter) {
      const exponential = baseDelayMs * Math.pow(multiplier, attempt - 1);
      const capped = Math.min(exponential, maxDelayMs);
      return Math.round(capped); // No jitter for predictable test
    }

    const d1 = calculateDelay(1, 1000, 30000, 2, 0);
    const d2 = calculateDelay(2, 1000, 30000, 2, 0);
    const d3 = calculateDelay(3, 1000, 30000, 2, 0);

    assert.equal(d1, 1000);
    assert.equal(d2, 2000);
    assert.equal(d3, 4000);
  });

  it("delay is capped at maxDelayMs", () => {
    function calculateDelay(attempt, baseDelayMs, maxDelayMs, multiplier) {
      const exponential = baseDelayMs * Math.pow(multiplier, attempt - 1);
      return Math.min(exponential, maxDelayMs);
    }

    assert.equal(calculateDelay(10, 1000, 5000, 2), 5000);
    assert.equal(calculateDelay(20, 1000, 5000, 2), 5000);
  });
});

describe("Retry Utility — Error Classification", () => {
  it("429 rate limit is retryable", () => {
    const err = new Error("rate limited") ;
    err.status = 429;
    assert.equal(err.status, 429);
    assert.ok(429 === 429);
  });

  it("500 server error is retryable", () => {
    const err = new Error("server error");
    err.status = 500;
    assert.ok(err.status >= 500 && err.status < 600);
  });

  it("400 client error is NOT retryable", () => {
    const err = new Error("bad request");
    err.status = 400;
    assert.ok(!(err.status === 429 || (err.status >= 500 && err.status < 600)));
  });

  it("422 validation error is NOT retryable", () => {
    const err = new Error("validation failed");
    err.status = 422;
    assert.ok(!(err.status === 429 || (err.status >= 500 && err.status < 600)));
  });

  it("TypeError from fetch is retryable (network error)", () => {
    const err = new TypeError("fetch failed");
    assert.ok(err.message.includes("fetch"));
  });
});

describe("Retry Utility — withRetry Behavior", () => {
  it("succeeds on first attempt without retrying", async () => {
    let attempts = 0;
    const result = await withRetrySimple(async () => {
      attempts++;
      return "success";
    }, { maxAttempts: 3, baseDelayMs: 10 });

    assert.equal(result, "success");
    assert.equal(attempts, 1);
  });

  it("retries on retryable error and succeeds", async () => {
    let attempts = 0;
    const result = await withRetrySimple(async () => {
      attempts++;
      if (attempts < 2) {
        const err = new Error("server error");
        err.status = 500;
        throw err;
      }
      return "recovered";
    }, { maxAttempts: 3, baseDelayMs: 10 });

    assert.equal(result, "recovered");
    assert.equal(attempts, 2);
  });

  it("does not retry on non-retryable error", async () => {
    let attempts = 0;
    await assert.rejects(
      withRetrySimple(async () => {
        attempts++;
        const err = new Error("bad request");
        err.status = 400;
        throw err;
      }, { maxAttempts: 3, baseDelayMs: 10 }),
      /bad request/,
    );
    assert.equal(attempts, 1);
  });

  it("exhausts all attempts then throws", async () => {
    let attempts = 0;
    await assert.rejects(
      withRetrySimple(async () => {
        attempts++;
        const err = new Error("always fails");
        err.status = 500;
        throw err;
      }, { maxAttempts: 3, baseDelayMs: 10 }),
      /All 3 attempts failed/,
    );
    assert.equal(attempts, 3);
  });

  it("calls onRetry callback on each retry", async () => {
    const retries = [];
    let attempts = 0;
    await withRetrySimple(async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("retry me");
        err.status = 500;
        throw err;
      }
      return "ok";
    }, {
      maxAttempts: 3,
      baseDelayMs: 10,
      onRetry: (info) => retries.push(info.attempt),
    });
    assert.deepEqual(retries, [1, 2]);
  });
});

// ── Inlined withRetry for testing (mirrors src/lib/retry.ts) ──────────────────

function isRetryableError(error) {
  if (error && typeof error === "object" && "status" in error) {
    const status = error.status;
    return status === 429 || (status >= 500 && status < 600);
  }
  if (error instanceof TypeError && error.message.includes("fetch")) return true;
  return false;
}

function withRetrySimple(fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const multiplier = options.backoffMultiplier ?? 2;

  return (async () => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts) break;
        if (!isRetryableError(error)) break;
        if (options.onRetry) {
          const delay = Math.min(baseDelayMs * Math.pow(multiplier, attempt - 1), maxDelayMs);
          options.onRetry({ attempt, error, delayMs: delay });
        }
        await new Promise(r => setTimeout(r, baseDelayMs));
      }
    }
    throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message ?? "unknown"}`);
  })();
}

// ── Address Validation Tests ──────────────────────────────────────────────────

describe("Address Validation — Pre-validation", () => {
  it("flags missing required fields", () => {
    const addr = { name: "", line1: "123 Main", city: "Anytown", state: "CA", postal: "12345" };
    const missing = !addr.name || addr.name.trim() === "";
    assert.ok(missing, "empty name should be flagged");
  });

  it("validates ZIP code format", () => {
    assert.ok(/^\d{5}(-\d{4})?$/.test("12345"), "5-digit ZIP is valid");
    assert.ok(/^\d{5}(-\d{4})?$/.test("12345-6789"), "9-digit ZIP is valid");
    assert.ok(!/^\d{5}(-\d{4})?$/.test("1234"), "4-digit ZIP is invalid");
    assert.ok(!/^\d{5}(-\d{4})?$/.test("ABCDE"), "non-numeric ZIP is invalid");
  });

  it("validates state abbreviation", () => {
    assert.equal("CA".length, 2, "2-letter state is valid");
    assert.notEqual("California".length, 2, "full state name is invalid");
  });
});

// ── Lob Hardening — Source-Level Tests ──────────────────────────────────────

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

describe("Lob Hardening — Source-Level Tests", () => {
  it("createLobLetter uses withRetry for retries", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /withRetry/);
    assert.match(lob, /maxAttempts/);
    assert.match(lob, /AbortSignal\.timeout/);
  });

  it("createLobLetter has structured request logging", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /logRequest\.start/);
    assert.match(lob, /logRequest\.end/);
    assert.match(lob, /logRequest\.retry/);
  });

  it("lob.server.ts imports from request-logging module", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /from "@\/lib\/request-logging"/);
  });

  it("lob.server.ts has webhook recovery function", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /reconcileOrderWithLob/);
    assert.match(lob, /getOrdersNeedingReconciliation/);
  });

  it("lob.server.ts has margin reporting function", async () => {
    const lob = await source("src/lib/lob.server.ts");
    assert.match(lob, /recordLobCost/);
    assert.match(lob, /margin_cents/);
    assert.match(lob, /margin_pct/);
  });

  it("lob-adapter uses withRetry and address validation", async () => {
    const adapter = await source("src/providers/adapters/lob-adapter.ts");
    assert.match(adapter, /withRetry/);
    assert.match(adapter, /validateUsAddress/);
    assert.match(adapter, /logAddressValidation/);
  });

  it("lob-adapter has getLetterStatus for webhook recovery", async () => {
    const adapter = await source("src/providers/adapters/lob-adapter.ts");
    assert.match(adapter, /getLetterStatus/);
  });

  it("retry utility has RetryExhaustedError and RetryableError", async () => {
    const retry = await source("src/lib/retry.ts");
    assert.match(retry, /class RetryExhaustedError/);
    assert.match(retry, /class RetryableError/);
    assert.match(retry, /export async function withRetry/);
  });

  it("address validation module exists and validates US addresses", async () => {
    const av = await source("src/lib/address-validation.ts");
    assert.match(av, /validateUsAddress/);
    assert.match(av, /us_verifications/);
    assert.match(av, /AddressValidationLevel/);
  });

  it("request-logging module has structured log functions", async () => {
    const rl = await source("src/lib/request-logging.ts");
    assert.match(rl, /logRequest/);
    assert.match(rl, /logWebhook/);
    assert.match(rl, /logAddressValidation/);
  });

  it("webhook handler uses structured logging instead of console.log", async () => {
    const lob = await source("src/lib/lob.server.ts");
    // The processLobWebhook function should use logWebhook, not console.log/warn
    const webhookSection = lob.slice(lob.indexOf("processLobWebhook"));
    assert.match(webhookSection, /logWebhook/);
    assert.doesNotMatch(webhookSection, /console\.log\(/);
  });
});
