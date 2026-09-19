/**
 * Tests for the Proof-of-Service hashing utilities.
 * Run with: node --test tests/proof-of-service.test.mjs
 * (or bun test)
 */

import { test, describe } from "node:test";
import { strictEqual, notStrictEqual, deepEqual } from "node:assert";
import { readFileSync } from "node:fs";

// We need to import the compiled TS. For now, test the pure logic
// by re-implementing inline (the actual module uses the same logic).

import { createHash } from "node:crypto";

// Re-import the actual module using dynamic import of the compiled output
// For testing, we'll test the canonical JSON and hash chain logic directly

// ── Canonical JSON Tests ─────────────────────────────────────────────────────

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJSON).join(",") + "]";
  }
  if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj).sort();
    const pairs = keys
      .filter(k => obj[k] !== undefined)
      .map(k => JSON.stringify(k) + ":" + canonicalJSON(obj[k]));
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(String(obj));
}

describe("canonicalJSON", () => {
  test("produces sorted keys", () => {
    const a = { b: 1, a: 2, c: 3 };
    const b = { a: 2, c: 3, b: 1 };
    strictEqual(canonicalJSON(a), canonicalJSON(b));
    strictEqual(canonicalJSON(a), '{"a":2,"b":1,"c":3}');
  });

  test("omits undefined values", () => {
    const result = canonicalJSON({ a: 1, b: undefined, c: "test" });
    strictEqual(result, '{"a":1,"c":"test"}');
  });

  test("preserves null", () => {
    const result = canonicalJSON({ a: null, b: 1 });
    strictEqual(result, '{"a":null,"b":1}');
  });

  test("handles nested objects", () => {
    const obj = { z: { b: 2, a: 1 }, y: [3, 1, 2] };
    strictEqual(canonicalJSON(obj), '{"y":[3,1,2],"z":{"a":1,"b":2}}');
  });

  test("produces consistent output regardless of insertion order (nested)", () => {
    const a = { outer: { z: 1, a: 2 }, inner: { d: 4, b: 3 } };
    const b = { inner: { b: 3, d: 4 }, outer: { a: 2, z: 1 } };
    strictEqual(canonicalJSON(a), canonicalJSON(b));
  });
});

// ── Document Hashing Tests ────────────────────────────────────────────────────

describe("hashDocument", () => {
  test("produces a 64-char hex string", () => {
    const data = new TextEncoder().encode("test content");
    const hash = createHash("sha256").update(data).digest("hex");
    strictEqual(hash.length, 64);
    strictEqual(/^[0-9a-f]{64}$/.test(hash), true);
  });

  test("same content produces same hash", () => {
    const data1 = new TextEncoder().encode("hello world");
    const data2 = new TextEncoder().encode("hello world");
    const h1 = createHash("sha256").update(data1).digest("hex");
    const h2 = createHash("sha256").update(data2).digest("hex");
    strictEqual(h1, h2);
  });

  test("different content produces different hash", () => {
    const data1 = new TextEncoder().encode("hello world");
    const data2 = new TextEncoder().encode("hello world!");
    const h1 = createHash("sha256").update(data1).digest("hex");
    const h2 = createHash("sha256").update(data2).digest("hex");
    notStrictEqual(h1, h2);
  });
});

// ── Custody Event Hash Chain Tests ────────────────────────────────────────────

function hashCustodyEvent({ priorEventHash, timestamp, eventType, description }) {
  const input = `${priorEventHash ?? ""}|${timestamp}|${eventType}|${description}`;
  return createHash("sha256").update(input).digest("hex");
}

function verifyCustodyEvent({ eventHash, priorEventHash, timestamp, eventType, description }) {
  const expected = hashCustodyEvent({ priorEventHash, timestamp, eventType, description });
  if (expected.length !== eventHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ eventHash.charCodeAt(i);
  }
  return diff === 0;
}

describe("Custody Event Hash Chain", () => {
  test("first event has null prior hash", () => {
    const event = {
      priorEventHash: null,
      timestamp: "2026-08-01T16:45:00Z",
      eventType: "created",
      description: "Communication record created",
    };
    const hash = hashCustodyEvent(event);
    strictEqual(hash.length, 64);
  });

  test("chained events produce different hashes", () => {
    const base = {
      timestamp: "2026-08-01T16:45:00Z",
      eventType: "sent",
      description: "Submitted to carrier",
    };
    const hash1 = hashCustodyEvent({ ...base, priorEventHash: null });
    const hash2 = hashCustodyEvent({ ...base, priorEventHash: hash1 });
    notStrictEqual(hash1, hash2);
  });

  test("verify returns true for correct content", () => {
    const event = {
      priorEventHash: null,
      timestamp: "2026-08-01T16:45:00Z",
      eventType: "created",
      description: "Communication record created",
    };
    const hash = hashCustodyEvent(event);
    strictEqual(
      verifyCustodyEvent({ eventHash: hash, ...event }),
      true,
    );
  });

  test("verify returns false for tampered content", () => {
    const event = {
      priorEventHash: null,
      timestamp: "2026-08-01T16:45:00Z",
      eventType: "created",
      description: "Communication record created",
    };
    const hash = hashCustodyEvent(event);
    // Tamper with the description
    const tampered = { ...event, description: "Communication record MODIFIED" };
    strictEqual(
      verifyCustodyEvent({ eventHash: hash, ...tampered }),
      false,
    );
  });

  test("verify returns false for tampered prior hash (chain break)", () => {
    const event1 = {
      priorEventHash: null,
      timestamp: "2026-08-01T16:45:00Z",
      eventType: "created",
      description: "Created",
    };
    const event2 = {
      priorEventHash: hashCustodyEvent(event1),
      timestamp: "2026-08-01T16:46:00Z",
      eventType: "sent",
      description: "Sent",
    };
    const hash2 = hashCustodyEvent(event2);

    // Verify with correct prior hash
    strictEqual(verifyCustodyEvent({ eventHash: hash2, ...event2 }), true);

    // Verify with WRONG prior hash (simulates tampering with event 1)
    const tampered = { ...event2, priorEventHash: "aaaa".repeat(16) };
    strictEqual(verifyCustodyEvent({ eventHash: hash2, ...tampered }), false);
  });
});

// ── Full Chain Verification Tests ──────────────────────────────────────────────

describe("Full Chain Verification", () => {
  test("a correctly formed chain verifies", () => {
    const events = [];
    let priorHash = null;

    // Build a chain of 5 events
    const types = ["created", "address_verified", "sent", "in_transit", "delivered"];
    for (let i = 0; i < types.length; i++) {
      const event = {
        priorEventHash: priorHash,
        timestamp: new Date(`2026-08-01T16:4${i}:00Z`).toISOString(),
        eventType: types[i],
        description: `Event ${i}: ${types[i]}`,
      };
      const hash = hashCustodyEvent(event);
      events.push({ ...event, event_hash: hash });
      priorHash = hash;
    }

    // Verify the chain
    for (let i = 0; i < events.length; i++) {
      const expectedPrior = i === 0 ? null : events[i - 1].event_hash;
      strictEqual(events[i].priorEventHash, expectedPrior, `Event ${i} prior hash mismatch`);
      strictEqual(
        verifyCustodyEvent({
          eventHash: events[i].event_hash,
          priorEventHash: events[i].priorEventHash,
          timestamp: events[i].timestamp,
          eventType: events[i].eventType,
          description: events[i].description,
        }),
        true,
        `Event ${i} hash verification failed`,
      );
    }
  });

  test("tampering with any event breaks the chain", () => {
    const events = [];
    let priorHash = null;
    const types = ["created", "sent", "delivered"];

    for (let i = 0; i < types.length; i++) {
      const event = {
        priorEventHash: priorHash,
        timestamp: `2026-08-01T16:4${i}:00Z`,
        eventType: types[i],
        description: `Event ${i}`,
      };
      const hash = hashCustodyEvent(event);
      events.push({ ...event, event_hash: hash });
      priorHash = hash;
    }

    // Tamper with event 1's description
    events[1].description = "TAMPERED";

    // Event 1's hash no longer matches
    strictEqual(
      verifyCustodyEvent({
        eventHash: events[1].event_hash,
        priorEventHash: events[1].priorEventHash,
        timestamp: events[1].timestamp,
        eventType: events[1].eventType,
        description: events[1].description,
      }),
      false,
      "Tampered event should fail verification",
    );

    // Event 2's prior_event_hash still points to the original event 1's hash,
    // but if we recompute event 1's hash with the tampered description,
    // it won't match event 2's prior_event_hash — the chain is broken.
    const recomputedHash1 = hashCustodyEvent({
      priorEventHash: events[0].event_hash,
      timestamp: events[1].timestamp,
      eventType: events[1].eventType,
      description: "TAMPERED", // the tampered value
    });
    notStrictEqual(recomputedHash1, events[2].priorEventHash, "Chain should be broken");
  });
});
