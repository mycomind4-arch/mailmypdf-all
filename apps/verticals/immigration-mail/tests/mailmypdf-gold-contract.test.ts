import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function read(path: string) {
  return readFile(resolve(root, path), "utf8");
}

// src/platform/mailmypdf.ts is now a compatibility shim that re-exports the
// canonical @mailmypdf/mailing-client package (see BUILD_STATUS.md's
// consolidation note); the HTTP/credential logic these contract checks care
// about lives in that package now, not the local file.
const mailingClientPath = resolve(root, "../../../packages/mailing-client/src/index.ts");
async function readMailingClient() {
  return readFile(mailingClientPath, "utf8");
}
const paymentFulfillmentPath = resolve(root, "../../../packages/payment-fulfillment/src/index.ts");
async function readPaymentFulfillment() {
  return readFile(paymentFulfillmentPath, "utf8");
}

describe("MailMyPDF Gold fulfillment contract", () => {
  it("is a thin compatibility shim over the canonical mailing client", async () => {
    const shim = await read("src/platform/mailmypdf.ts");
    expect(shim).toContain("@mailmypdf/mailing-client");
  });

  it("uses the canonical MailMyPDF v1 endpoints and preserves multipart boundaries", async () => {
    const source = await readMailingClient();
    expect(source).toContain('"/v1/documents"');
    expect(source).toContain('"/v1/communications"');
    expect(source).toContain("instanceof FormData");
    expect(source).not.toContain('"/api/v1/documents"');
    expect(source).not.toContain('"/api/v1/communications"');
  });

  it("requires authenticated payment before fulfillment", async () => {
    const checkout = await read("server/api/checkout.ts");
    const fulfillment = await read("server/api/mail/response.ts");
    const paymentFulfillment = await readPaymentFulfillment();
    expect(checkout).toContain("requireAuthenticatedUser");
    expect(checkout).toContain("mailing_intents");
    expect(checkout).toContain("stripe.checkout.sessions.create");
    expect(fulfillment).toContain("requireAuthenticatedUser");
    expect(fulfillment).toContain('session.payment_status !== "paid"');
    expect(fulfillment).toContain("owner_user_id");
    // Idempotency keying off the Stripe session now lives in the canonical
    // payment-fulfillment engine (fulfillFromBrowserReturn), not this route.
    expect(paymentFulfillment).toContain("stripe:");
  });

  it("bridges the legacy workflow through secure checkout instead of pretending fulfillment", async () => {
    const casesSource = await read("src/lib/cases.ts");
    const rootSource = await read("src/routes/__root.tsx");
    expect(casesSource).toContain('fetch("/api/checkout"');
    expect(casesSource).toContain("window.location.assign(payload.checkoutUrl)");
    expect(rootSource).toContain('fetch("/api/mail/response"');
    expect(rootSource).toContain("stripeSessionId");
    expect(rootSource).toContain("mailing");
  });

  it("keeps MailMyPDF credentials server-side", async () => {
    const adapter = await readMailingClient();
    expect(adapter).toContain("process.env.MAILMYPDF_API_KEY");
    expect(adapter).not.toContain("import.meta.env.MAILMYPDF_API_KEY");
  });
});
