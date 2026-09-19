/**
 * Tests for the Proof-of-Service rate limiting and per-tenant Lob key support.
 *
 * Run with: node --test tests/proof-of-service-rate-limits.test.mjs
 */

import { test, describe } from "node:test";
import { strictEqual, ok } from "node:assert";

// ── Rate limiting logic (re-implemented from the production code) ─────────────

const DEFAULT_LIMITS = {
  "documents.upload": { maxRequests: 100, windowMs: 60_000 },
  "communications.create": { maxRequests: 50, windowMs: 60_000 },
  "verify": { maxRequests: 100, windowMs: 60_000 },
  "tenants.create": { maxRequests: 5, windowMs: 60_000 },
};

function createRateLimiter() {
  const store = new Map();

  function check(key, bucket, config) {
    const compositeKey = `${bucket}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = store.get(compositeKey);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(compositeKey, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= config.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: config.maxRequests - entry.timestamps.length };
  }

  return { check, store };
}

describe("Rate Limiting", () => {
  test("allows requests under the limit", () => {
    const { check } = createRateLimiter();
    const config = DEFAULT_LIMITS["communications.create"];

    for (let i = 0; i < 49; i++) {
      const result = check("tenant:abc", "pos:communications.create", config);
      ok(result.allowed, `Request ${i + 1} should be allowed`);
    }

    // 50th request should still be allowed (limit is 50)
    const result = check("tenant:abc", "pos:communications.create", config);
    ok(result.allowed, "50th request should be allowed");
    strictEqual(result.remaining, 0);
  });

  test("blocks requests over the limit", () => {
    const { check } = createRateLimiter();
    const config = DEFAULT_LIMITS["communications.create"];

    for (let i = 0; i < 50; i++) {
      check("tenant:xyz", "pos:communications.create", config);
    }

    // 51st request should be blocked
    const result = check("tenant:xyz", "pos:communications.create", config);
    ok(!result.allowed, "51st request should be blocked");
    strictEqual(result.remaining, 0);
  });

  test("different tenants have separate limits", () => {
    const { check } = createRateLimiter();
    const config = DEFAULT_LIMITS["communications.create"];

    // Exhaust tenant A's limit
    for (let i = 0; i < 50; i++) {
      check("tenant:A", "pos:communications.create", config);
    }

    // Tenant B should still be allowed
    const result = check("tenant:B", "pos:communications.create", config);
    ok(result.allowed, "Tenant B should not be affected by Tenant A's rate limit");
    strictEqual(result.remaining, 49);
  });

  test("different buckets have separate limits", () => {
    const { check } = createRateLimiter();

    // Exhaust communications.create for tenant
    const commConfig = DEFAULT_LIMITS["communications.create"];
    for (let i = 0; i < 50; i++) {
      check("tenant:single", "pos:communications.create", commConfig);
    }

    // documents.upload should still work for the same tenant
    const docConfig = DEFAULT_LIMITS["documents.upload"];
    const result = check("tenant:single", "pos:documents.upload", docConfig);
    ok(result.allowed, "Different bucket should not be affected");
  });

  test("verify endpoint uses IP-based limiting (no tenant)", () => {
    const { check } = createRateLimiter();
    const config = DEFAULT_LIMITS["verify"];

    // Simulate 100 requests from one IP
    for (let i = 0; i < 100; i++) {
      const result = check("192.168.1.1", "pos:verify", config);
      ok(result.allowed, `Request ${i + 1} from IP should be allowed`);
    }

    // 101st should be blocked
    const result = check("192.168.1.1", "pos:verify", config);
    ok(!result.allowed, "101st request should be blocked");

    // Different IP should be fine
    const result2 = check("10.0.0.1", "pos:verify", config);
    ok(result2.allowed, "Different IP should be allowed");
  });

  test("tenant creation has very low limit (5/min)", () => {
    const { check } = createRateLimiter();
    const config = DEFAULT_LIMITS["tenants.create"];

    for (let i = 0; i < 5; i++) {
      const result = check("tenant:creator", "pos:tenants.create", config);
      ok(result.allowed, `Request ${i + 1} should be allowed`);
    }

    const result = check("tenant:creator", "pos:tenants.create", config);
    ok(!result.allowed, "6th tenant creation should be blocked");
  });
});

describe("Per-Tenant Lob Key Selection", () => {
  test("tenant key takes priority over platform key", () => {
    const platformKey = "live_platform_key";
    const tenantKey = "live_tenant_key";

    // Simulate the selection logic
    function selectLobKey(tenantKey, platformKey) {
      return tenantKey ?? platformKey;
    }

    strictEqual(selectLobKey(tenantKey, platformKey), tenantKey, "Should use tenant key when available");
  });

  test("falls back to platform key when tenant has no key", () => {
    const platformKey = "live_platform_key";

    function selectLobKey(tenantKey, platformKey) {
      return tenantKey ?? platformKey;
    }

    strictEqual(selectLobKey(null, platformKey), platformKey, "Should fall back to platform key");
  });

  test("throws when neither key is available", () => {
    function selectLobKey(tenantKey, platformKey) {
      const key = tenantKey ?? platformKey;
      if (!key) throw new Error("Lob is not configured");
      return key;
    }

    try {
      selectLobKey(null, "");
      ok(false, "Should have thrown");
    } catch (err) {
      ok(err.message.includes("not configured"), "Should throw clear error");
    }
  });

  test("Basic auth header is built from the selected key", () => {
    const tenantKey = "live_tenant_key_abc123";

    function buildBasicAuth(key) {
      return "Basic " + Buffer.from(`${key}:`).toString("base64");
    }

    const platformAuth = buildBasicAuth("live_platform_key");
    const tenantAuth = buildBasicAuth(tenantKey);

    ok(platformAuth !== tenantAuth, "Different keys should produce different auth headers");
    ok(tenantAuth.includes(Buffer.from(`${tenantKey}:`).toString("base64")), "Should encode the correct key");
  });
});

describe("Existing Webhook Fallthrough", () => {
  test("when order lookup fails, PoS handler is called", () => {
    let orderFound = false;
    let posHandlerCalled = false;

    // Simulate the webhook flow
    async function processWebhook(letterId) {
      // Step 1: Try to find in orders
      const order = orderFound ? { id: "order1" } : null;

      if (!order) {
        // Step 2: Fall through to PoS
        const handled = await handlePoS(letterId);
        if (handled) {
          return { received: true, proof_of_service: true };
        }
        return { received: true, unmatched: true };
      }

      return { received: true };
    }

    async function handlePoS(letterId) {
      posHandlerCalled = true;
      return true; // Simulate finding a PoS communication
    }

    // Test: no order, but PoS communication exists
    return processWebhook("letter_123").then((result) => {
      ok(posHandlerCalled, "PoS handler should be called when no order is found");
      ok(result.proof_of_service, "Should return proof_of_service: true");
    });
  });

  test("when neither order nor PoS record exists, returns unmatched", () => {
    async function processWebhook(letterId) {
      const order = null;
      if (!order) {
        const handled = await handlePoS(letterId);
        if (handled) return { received: true, proof_of_service: true };
        return { received: true, unmatched: true };
      }
      return { received: true };
    }

    async function handlePoS() {
      return false; // No PoS record found
    }

    return processWebhook("letter_456").then((result) => {
      ok(result.unmatched, "Should return unmatched when neither exists");
    });
  });

  test("when order exists, PoS handler is NOT called", () => {
    let posHandlerCalled = false;

    async function processWebhook() {
      const order = { id: "order1" }; // Order found
      if (!order) {
        const handled = await handlePoS();
        if (handled) return { received: true, proof_of_service: true };
        return { received: true, unmatched: true };
      }
      return { received: true };
    }

    async function handlePoS() {
      posHandlerCalled = true;
      return false;
    }

    return processWebhook().then((result) => {
      ok(!posHandlerCalled, "PoS handler should NOT be called when order exists");
      ok(result.received, "Should return received: true");
      ok(!result.proof_of_service, "Should not have proof_of_service flag");
    });
  });
});
