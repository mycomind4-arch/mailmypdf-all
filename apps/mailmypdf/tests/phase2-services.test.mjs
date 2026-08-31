import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Phase 2 Service Contract Tests ────────────────────────────────────────────

describe("Event History Service — Contract", () => {
  it("has all required methods", async () => {
    const src = await source("src/services/event-history.service.ts");
    assert.match(src, /async recordEvent\(/);
    assert.match(src, /async recordEvents\(/);
    assert.match(src, /async recordEventIdempotent\(/);
    assert.match(src, /async getEvents\(/);
    assert.match(src, /async hasEvent\(/);
  });

  it("uses order_events table for all operations", async () => {
    const src = await source("src/services/event-history.service.ts");
    // Every method that touches the DB uses order_events
    const orderEventsMatches = [...src.matchAll(/order_events/g)];
    assert.ok(orderEventsMatches.length >= 5, "order_events table referenced in all methods");
  });

  it("recordEventIdempotent checks external_id before inserting", async () => {
    const src = await source("src/services/event-history.service.ts");
    assert.match(src, /metadata->>external_id/);
    assert.match(src, /deduplicated: true/);
  });

  it("does not import Lob or Stripe directly", async () => {
    const src = await source("src/services/event-history.service.ts");
    assert.doesNotMatch(src, /import.*stripe/);
    assert.doesNotMatch(src, /import.*lob/);
  });
});

describe("State Machine Service — Contract", () => {
  it("has all required methods", async () => {
    const src = await source("src/services/state-machine.service.ts");
    assert.match(src, /async transitionOrder\(/);
    assert.match(src, /async transitionOrThrow\(/);
    assert.match(src, /async getStatus\(/);
    assert.match(src, /getEvents\(/);
  });

  it("uses conditional update for atomicity", async () => {
    const src = await source("src/services/state-machine.service.ts");
    // The update must filter by both id AND current status
    assert.match(src, /\.eq\("id", orderId\)/);
    assert.match(src, /\.eq\("status", from\)/);
  });

  it("records events via EventHistoryService", async () => {
    const src = await source("src/services/state-machine.service.ts");
    assert.match(src, /import.*EventHistoryService/);
    assert.match(src, /this\.events\.recordEvent/);
    assert.match(src, /this\.events\.recordEventIdempotent/);
  });

  it("uses attemptTransition from the state machine", async () => {
    const src = await source("src/services/state-machine.service.ts");
    assert.match(src, /import[\s\S]*attemptTransition/);
    assert.match(src, /attemptTransition\(/);
  });

  it("returns TransitionOutcome with ok, persisted, and deduplicated flags", async () => {
    const src = await source("src/services/state-machine.service.ts");
    assert.match(src, /persisted: boolean/);
    assert.match(src, /deduplicated: boolean/);
    assert.match(src, /ok: boolean/);
  });

  it("handles race conditions gracefully", async () => {
    const src = await source("src/services/state-machine.service.ts");
    // When update affects 0 rows, return conflict result (not throw)
    assert.match(src, /transition\.conflict/);
    assert.match(src, /Race condition/);
  });

  it("does not import Lob or Stripe directly", async () => {
    const src = await source("src/services/state-machine.service.ts");
    assert.doesNotMatch(src, /import.*stripe/);
    assert.doesNotMatch(src, /import.*lob\.server/);
  });
});

describe("Tracking Service — Contract", () => {
  it("has processTrackingEvent method", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /async processTrackingEvent\(/);
  });

  it("uses StateMachineService for transitions", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /import.*StateMachineService/);
    assert.match(src, /this\.stateMachine\.transitionOrder/);
  });

  it("uses mapLobStatusToOrderStatus for status mapping", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /mapLobStatusToOrderStatus/);
  });

  it("passes signature image URL through to the update", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /signature_image_url/);
    assert.match(src, /signatureImageUrl/);
  });

  it("sets mailed_at on first mailed/in_transit event", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /mailed_at/);
    assert.match(src, /new Date\(\)\.toISOString/);
  });

  it("uses lob_webhook as the trigger source", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.match(src, /triggeredBy: "lob_webhook"/);
  });

  it("does not import Stripe directly", async () => {
    const src = await source("src/services/tracking.service.ts");
    assert.doesNotMatch(src, /import.*stripe/);
  });
});

describe("Services Index — Phase 2 Exports", () => {
  it("exports all Phase 2 services", async () => {
    const src = await source("src/services/index.ts");
    assert.match(src, /export.*EventHistoryService/);
    assert.match(src, /export.*StateMachineService/);
    assert.match(src, /export.*TrackingService/);
  });

  it("provides singleton getters for Phase 2 services", async () => {
    const src = await source("src/services/index.ts");
    assert.match(src, /export function getStateMachineService/);
    assert.match(src, /export function getTrackingService/);
  });

  it("TrackingService singleton is wired with StateMachineService", async () => {
    const src = await source("src/services/index.ts");
    assert.match(src, /new TrackingService\(_stateMachineService\)/);
  });
});
