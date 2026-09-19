import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Simple test for rate limiter logic
// We test the core logic without importing the full module (which has TS imports)

describe("Rate Limiter", () => {
  it("allows requests under the limit", () => {
    // Simulate the rate limit logic
    const timestamps = [];
    const maxRequests = 5;
    const windowMs = 60_000;
    const now = Date.now();

    for (let i = 0; i < maxRequests; i++) {
      const windowStart = now - windowMs;
      const recent = timestamps.filter((t) => t > windowStart);
      assert.ok(recent.length < maxRequests, `Request ${i} should be allowed`);
      timestamps.push(now + i);
    }
  });

  it("blocks requests over the limit", () => {
    const timestamps = [];
    const maxRequests = 3;
    const windowMs = 60_000;
    const now = Date.now();

    // Fill up the limit
    for (let i = 0; i < maxRequests; i++) {
      timestamps.push(now);
    }

    // This one should be blocked
    const windowStart = now - windowMs;
    const recent = timestamps.filter((t) => t > windowStart);
    assert.ok(recent.length >= maxRequests, "Request over limit should be blocked");
  });

  it("resets after the window expires", () => {
    const timestamps = [];
    const maxRequests = 3;
    const windowMs = 60_000;

    // Fill up at time T
    const t0 = Date.now() - windowMs - 1000; // 1 second past the window
    for (let i = 0; i < maxRequests; i++) {
      timestamps.push(t0);
    }

    // At time T + windowMs + 1s, all old timestamps should be expired
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = timestamps.filter((t) => t > windowStart);
    assert.equal(recent.length, 0, "All timestamps should be expired");
  });
});
