import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Phase 2 Integration: Service Wiring Tests ─────────────────────────────────

describe("Payment Webhook — State Machine Service Integration", () => {
  it("refund handler uses StateMachineService for atomic transitions", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));

    // The refund handler should import and use getStateMachineService
    assert.match(refundSection, /getStateMachineService/);
    assert.match(refundSection, /transitionOrder/);
    assert.match(refundSection, /triggeredBy:\s*"stripe_webhook"/);
  });

  it("refund handler still has canTransition pre-check (belt and suspenders)", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /canTransition/);
    assert.match(refundSection, /refunded/);
  });

  it("refund handler logs warning on transition failure", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /result\.ok/);
    assert.match(refundSection, /log\.warn/);
  });

  it("refund handler passes refund metadata to the state machine", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /refund_id/);
    assert.match(refundSection, /external_id:\s*eventId/);
  });

  it("refund handler no longer does direct non-atomic DB update", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));

    // The old pattern was a direct update without status condition
    // The new pattern uses transitionOrder which does a conditional update
    assert.doesNotMatch(
      refundSection,
      /from\("orders"\)[\s\S]*update\(\s*\{\s*status:\s*"refunded"/,
    );
  });
});

describe("Lob Webhook — TrackingService Availability", () => {
  it("processLobWebhook references TrackingService for future migration", async () => {
    const lob = await source("src/lib/lob.server.ts");
    const webhookSection = lob.slice(lob.indexOf("processLobWebhook"));
    assert.match(webhookSection, /TrackingService/);
  });

  it("existing Lob webhook logic still works (canTransition + mapLobStatusToOrderStatus)", async () => {
    const lob = await source("src/lib/lob.server.ts");
    const webhookSection = lob.slice(lob.indexOf("processLobWebhook"));
    assert.match(webhookSection, /canTransition/);
    assert.match(webhookSection, /mapLobStatusToOrderStatus/);
    assert.match(webhookSection, /getFulfillmentProgress/);
  });
});

describe("Service Layer — Cross-cutting Integration", () => {
  it("payment webhook imports from @/services", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    // The refund handler dynamically imports getStateMachineService
    assert.match(webhook, /await import\("@\/services"\)/);
  });

  it("services index exports getStateMachineService singleton", async () => {
    const index = await source("src/services/index.ts");
    assert.match(index, /export function getStateMachineService/);
  });

  it("StateMachineService uses EventHistoryService for event recording", async () => {
    const sm = await source("src/services/state-machine.service.ts");
    assert.match(sm, /EventHistoryService/);
    assert.match(sm, /recordEventIdempotent/);
    assert.match(sm, /recordEvent/);
  });

  it("TrackingService uses StateMachineService for transitions", async () => {
    const ts = await source("src/services/tracking.service.ts");
    assert.match(ts, /StateMachineService/);
    assert.match(ts, /transitionOrder/);
  });
});
