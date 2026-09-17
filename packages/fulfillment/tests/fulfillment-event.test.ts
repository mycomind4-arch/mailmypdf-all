import assert from "node:assert/strict";
import test from "node:test";
import {
  createProviderFulfillmentEvent,
  providerConfirmedActualSentAt,
} from "../src/index.js";

test("submitted and processing events never infer an actual send timestamp", () => {
  for (const status of ["submitted", "provider_processing"] as const) {
    const event = createProviderFulfillmentEvent({
      providerOrderId: "letter_123",
      status,
      occurredAt: "2026-09-17T20:00:00.000Z",
    });
    assert.equal(providerConfirmedActualSentAt(event), null);
  }
});

test("provider-confirmed mailed event preserves explicit actualSentAt", () => {
  const event = createProviderFulfillmentEvent({
    providerOrderId: "letter_123",
    providerEventId: "evt_123",
    status: "mailed",
    occurredAt: "2026-09-18T01:00:00.000Z",
    actualSentAt: "2026-09-17T23:45:00.000Z",
    trackingNumber: "TRACK-123",
  });

  assert.equal(providerConfirmedActualSentAt(event), "2026-09-17T23:45:00.000Z");
});

test("submission cannot be mislabeled with an actual send timestamp", () => {
  assert.throws(
    () => createProviderFulfillmentEvent({
      providerOrderId: "letter_123",
      status: "submitted",
      occurredAt: "2026-09-17T20:00:00.000Z",
      actualSentAt: "2026-09-17T20:00:00.000Z",
    }),
    /does not confirm that the mailing was actually sent/,
  );
});

test("delivery timestamps require delivered status", () => {
  assert.throws(
    () => createProviderFulfillmentEvent({
      providerOrderId: "letter_123",
      status: "in_transit",
      occurredAt: "2026-09-18T20:00:00.000Z",
      deliveredAt: "2026-09-18T19:00:00.000Z",
    }),
    /deliveredAt may only be recorded for delivered mail/,
  );
});
