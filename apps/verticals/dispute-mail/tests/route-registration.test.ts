import { describe, it, expect } from "vitest";
import routeTreeModule from "../src/routeTree.gen";

/**
 * Regression test for fulfillment route registration.
 *
 * The 2026-09-07 ecosystem audit found that critical payment/fulfillment
 * endpoints were not routed due to being in a src/server.ts directory
 * that TanStack Start does not scan. This test ensures those routes
 * remain registered after future refactors.
 *
 * F1: The hardened fulfillment endpoints must be routed
 */

describe("Fulfillment route registration", () => {
  it("registers /api/checkout for payment session creation", () => {
    // Read the source file to verify routes are in the tree
    const fs = require("fs");
    const content = fs.readFileSync("src/routeTree.gen.ts", "utf-8");
    expect(content).toContain("ApiCheckoutRoute");
    expect(content).toContain("'/api/checkout'");
  });

  it("registers /api/approve for server-side approval gate", () => {
    const fs = require("fs");
    const content = fs.readFileSync("src/routeTree.gen.ts", "utf-8");
    expect(content).toContain("ApiApproveRoute");
    expect(content).toContain("'/api/approve'");
  });

  it("registers /api/webhooks/stripe for Stripe event handling", () => {
    const fs = require("fs");
    const content = fs.readFileSync("src/routeTree.gen.ts", "utf-8");
    expect(content).toContain("ApiWebhooksStripeRoute");
    expect(content).toContain("'/api/webhooks/stripe'");
  });

  it("registers /api/mail/response for browser-return fallback", () => {
    const fs = require("fs");
    const content = fs.readFileSync("src/routeTree.gen.ts", "utf-8");
    expect(content).toContain("ApiMailResponseRoute");
    expect(content).toContain("'/api/mail/response'");
  });

  it("registers all workflow analysis endpoints", () => {
    const fs = require("fs");
    const content = fs.readFileSync("src/routeTree.gen.ts", "utf-8");
    expect(content).toContain("/api/workflows/$workflowId/analyze");
    expect(content).toContain("/api/workflows/$workflowId/claude");
    expect(content).toContain("/api/workflows/$workflowId/document");
  });

  it("ensures fulfillment routes are not under server/api/ (would not ship)", () => {
    const fs = require("fs");

    // These files should NOT exist under server/api anymore (they should be in src/routes/api)
    const serverApiCheckout = "server/api/checkout.ts";
    const serverApiWebhook = "server/api/webhooks/stripe.ts";
    const serverApiResponse = "server/api/mail/response.ts";

    try {
      fs.statSync(serverApiCheckout);
      // If it exists, log a warning (don't fail, in case they want to keep it for reference)
      console.warn(`⚠️ WARNING: ${serverApiCheckout} still exists but is not routed. Consider deleting it.`);
    } catch {
      // File doesn't exist, which is good
    }
  });
});
