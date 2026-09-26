import assert from "node:assert/strict";
import test from "node:test";
import {
  assertIdentityVerified,
  InMemoryVerificationProvider,
  isIdentityVerified,
} from "../src/index.js";
import type { VerificationSessionRequest } from "../src/index.js";

function baseRequest(overrides: Partial<VerificationSessionRequest> = {}): VerificationSessionRequest {
  return {
    subject: { name: "Jordan Party", matterId: "matter-1", purpose: "matter-party-identity" },
    requiredMethods: ["document"],
    now: "2026-09-26T00:00:00.000Z",
    ...overrides,
  };
}

test("createSession rejects malformed input", async () => {
  const provider = new InMemoryVerificationProvider();
  await assert.rejects(() => provider.createSession(baseRequest({ subject: { name: "", matterId: "m1", purpose: "matter-party-identity" } })));
  await assert.rejects(() => provider.createSession(baseRequest({ requiredMethods: [] })));
  await assert.rejects(() => provider.createSession(baseRequest({ requiredMethods: ["document", "document"] })));
  await assert.rejects(() => provider.createSession(baseRequest({ expiresAt: "2020-01-01T00:00:00.000Z" })));
});

test("a single required method that passes verifies the session", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest());
  assert.equal(session.status, "pending");
  assert.equal(isIdentityVerified(session), false);

  const verified = await provider.simulateCheckResult(session.id, {
    method: "document",
    passed: true,
    confidence: 0.97,
    reasonCodes: [],
    at: "2026-09-26T00:01:00.000Z",
  });

  assert.equal(verified.status, "verified");
  assert.equal(isIdentityVerified(verified), true);
  assert.equal(verified.verifiedIdentity?.name, "Jordan Party");
  assert.doesNotThrow(() => assertIdentityVerified(verified));
});

test("all required methods must pass before verification completes", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest({ requiredMethods: ["document", "biometric"] }));

  const afterDocument = await provider.simulateCheckResult(session.id, {
    method: "document",
    passed: true,
    confidence: 0.9,
    reasonCodes: [],
    at: "2026-09-26T00:01:00.000Z",
  });
  assert.equal(afterDocument.status, "pending");
  assert.throws(() => assertIdentityVerified(afterDocument));

  const afterBiometric = await provider.simulateCheckResult(session.id, {
    method: "biometric",
    passed: true,
    confidence: 0.88,
    reasonCodes: [],
    at: "2026-09-26T00:02:00.000Z",
  });
  assert.equal(afterBiometric.status, "verified");
});

test("a failed required check fails the session immediately, with no in-place retry", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest({ requiredMethods: ["document", "biometric"] }));

  const failed = await provider.simulateCheckResult(session.id, {
    method: "document",
    passed: false,
    confidence: 0.2,
    reasonCodes: ["id_number_mismatch"],
    at: "2026-09-26T00:01:00.000Z",
  });
  assert.equal(failed.status, "failed");

  await assert.rejects(() =>
    provider.simulateCheckResult(session.id, {
      method: "biometric",
      passed: true,
      confidence: 0.9,
      reasonCodes: [],
      at: "2026-09-26T00:02:00.000Z",
    }),
  );
});

test("a canceled or expired session rejects further check results", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest());
  const canceled = await provider.cancelSession(session.id, "customer withdrew", "2026-09-26T00:01:00.000Z");
  assert.equal(canceled.status, "canceled");

  await assert.rejects(() =>
    provider.simulateCheckResult(session.id, {
      method: "document",
      passed: true,
      confidence: 0.9,
      reasonCodes: [],
      at: "2026-09-26T00:02:00.000Z",
    }),
  );

  const expiring = await provider.createSession(baseRequest({ expiresAt: "2026-09-26T00:05:00.000Z" }));
  await assert.rejects(() =>
    provider.simulateCheckResult(expiring.id, {
      method: "document",
      passed: true,
      confidence: 0.9,
      reasonCodes: [],
      at: "2026-09-26T00:10:00.000Z",
    }),
  );
});

test("recording a duplicate method or an unrequested method is rejected", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest({ requiredMethods: ["document", "biometric"] }));
  await provider.simulateCheckResult(session.id, {
    method: "document",
    passed: true,
    confidence: 0.9,
    reasonCodes: [],
    at: "2026-09-26T00:01:00.000Z",
  });
  await assert.rejects(() =>
    provider.simulateCheckResult(session.id, {
      method: "document",
      passed: true,
      confidence: 0.9,
      reasonCodes: [],
      at: "2026-09-26T00:02:00.000Z",
    }),
  );
  await assert.rejects(() =>
    provider.simulateCheckResult(session.id, {
      method: "database",
      passed: true,
      confidence: 0.9,
      reasonCodes: [],
      at: "2026-09-26T00:02:00.000Z",
    }),
  );
});

test("confidence must be within [0, 1]", async () => {
  const provider = new InMemoryVerificationProvider();
  const session = await provider.createSession(baseRequest());
  await assert.rejects(() =>
    provider.simulateCheckResult(session.id, {
      method: "document",
      passed: true,
      confidence: 1.5,
      reasonCodes: [],
      at: "2026-09-26T00:01:00.000Z",
    }),
  );
});
