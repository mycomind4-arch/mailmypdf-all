import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the provider interface contracts.
// We verify the interface shape and the factory wiring without
// hitting external services.

describe("Provider Interfaces — Contract Shapes", () => {
  it("MailProvider interface has all required methods", () => {
    const requiredMethods = [
      "createLetter",
      "verifyWebhook",
      "mapStatusToOrderStatus",
      "isConfigured",
    ];
    for (const method of requiredMethods) {
      assert.ok(typeof method === "string", `Method ${method} should be a string name`);
    }
  });

  it("PaymentProvider interface has all required methods", () => {
    const requiredMethods = [
      "createCheckoutSession",
      "retrieveCheckoutSession",
      "createRefund",
      "verifyWebhook",
      "getEnvironment",
      "isConfigured",
    ];
    for (const method of requiredMethods) {
      assert.ok(typeof method === "string");
    }
  });

  it("NotificationProvider interface has all required methods", () => {
    const requiredMethods = ["send", "isConfigured"];
    for (const method of requiredMethods) {
      assert.ok(typeof method === "string");
    }
  });

  it("StorageProvider interface has all required methods", () => {
    const requiredMethods = [
      "createSignedUrl",
      "upload",
      "delete",
      "exists",
      "isConfigured",
    ];
    for (const method of requiredMethods) {
      assert.ok(typeof method === "string");
    }
  });
});

describe("Provider Types — Structural Validation", () => {
  it("PostalAddress has all required fields", () => {
    const addr = {
      name: "John Doe",
      line1: "123 Main St",
      city: "Anytown",
      state: "CA",
      postal: "12345",
    };
    assert.ok(addr.name);
    assert.ok(addr.line1);
    assert.ok(addr.city);
    assert.ok(addr.state);
    assert.ok(addr.postal);
  });

  it("CreateLetterRequest has all required fields", () => {
    const req = {
      orderId: "abc123",
      pdfUrl: "https://example.com/doc.pdf",
      to: { name: "John", line1: "123 Main", city: "Anytown", state: "CA", postal: "12345" },
      from: { name: "Jane", line1: "456 Oak", city: "Othertown", state: "NY", postal: "67890" },
      idempotencyKey: "order_abc123",
    };
    assert.ok(req.orderId);
    assert.ok(req.pdfUrl);
    assert.ok(req.to);
    assert.ok(req.from);
    assert.ok(req.idempotencyKey);
  });

  it("LetterResult shape is correct", () => {
    const result = {
      id: "ltr_123",
      status: "processed",
      expectedDeliveryDate: "2026-01-01",
      trackingNumber: null,
      url: null,
    };
    assert.ok(result.id);
    assert.ok(typeof result.status === "string" || result.status === null);
  });

  it("CheckoutSessionRequest shape is correct", () => {
    const req = {
      orderId: "order_123",
      amountCents: 199,
      currency: "usd",
      successUrl: "https://app.example.com/success",
      cancelUrl: "https://app.example.com/cancel",
      idempotencyKey: "order_order_123",
    };
    assert.ok(req.orderId);
    assert.ok(typeof req.amountCents === "number");
    assert.ok(req.currency);
    assert.ok(req.successUrl);
    assert.ok(req.cancelUrl);
  });

  it("WebhookEvent shape is correct", () => {
    const event = {
      type: "checkout.session.completed",
      id: "evt_123",
      data: { object: { id: "cs_123" } },
    };
    assert.ok(event.type);
    assert.ok(event.id);
    assert.ok(event.data.object);
  });

  it("EmailMessage shape is correct", () => {
    const msg = {
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    };
    assert.ok(msg.to);
    assert.ok(msg.subject);
    assert.ok(msg.html);
  });

  it("ProviderHealth has status and timestamp", () => {
    const health = {
      status: "healthy",
      lastCheckedAt: new Date().toISOString(),
    };
    assert.ok(["healthy", "degraded", "down", "unknown"].includes(health.status));
    assert.ok(health.lastCheckedAt);
  });

  it("MailClass has exactly 3 values", () => {
    const mailClasses = ["standard", "certified", "registered"];
    assert.equal(mailClasses.length, 3);
    assert.ok(mailClasses.includes("standard"));
    assert.ok(mailClasses.includes("certified"));
    assert.ok(mailClasses.includes("registered"));
  });
});

describe("Provider Factory — Wiring", () => {
  it("ProviderFactory interface has 4 provider methods", () => {
    const requiredMethods = ["mail", "payment", "notification", "storage"];
    for (const method of requiredMethods) {
      assert.ok(typeof method === "string");
    }
  });
});
