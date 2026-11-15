import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/routes/api/public/payments/webhook.ts", import.meta.url), "utf8");

describe("Stripe paid-order persistence retry contract (source regression)", () => {
  it("throws on a failed durable paid-order update rather than acknowledging delivery", () => {
    assert.match(source, /if \(updateErr\) \{[\s\S]*?throw new Error\("Stripe paid-order persistence failed"\);\s*\}/);
  });

  it("returns retryable HTTP 500 for processing exceptions", () => {
    assert.match(source, /catch \(e\) \{\s*log\.error\("webhook error"[\s\S]*?new Response\("Webhook error", \{ status: 500 \}\)/);
  });

  it("keeps legacy client-priced bulk payments out of the paid transition", () => {
    assert.match(source, /if \(session\.metadata\?\.isBulk === "true"\) \{/);
  });
});
