import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function read(path: string) {
  return readFile(resolve(root, path), "utf8");
}

describe("MailMyPDF Gold fulfillment contract", () => {
  it("uses the canonical MailMyPDF v1 endpoints and preserves multipart boundaries", async () => {
    const source = await read("src/platform/mailmypdf.ts");
    expect(source).toContain('"/v1/documents"');
    expect(source).toContain('"/v1/communications"');
    expect(source).toContain("!(init.body instanceof FormData)");
    expect(source).not.toContain('"/api/v1/documents"');
    expect(source).not.toContain('"/api/v1/communications"');
  });

  it("requires authenticated payment before fulfillment", async () => {
    const checkout = await read("server/api/checkout.ts");
    const fulfillment = await read("server/api/mail/response.ts");
    expect(checkout).toContain("requireAuthenticatedUser");
    expect(checkout).toContain("mailing_intents");
    expect(checkout).toContain("stripe.checkout.sessions.create");
    expect(fulfillment).toContain("requireAuthenticatedUser");
    expect(fulfillment).toContain('session.payment_status !== "paid"');
    expect(fulfillment).toContain("owner_user_id");
    expect(fulfillment).toContain("stripe:");
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
    const adapter = await read("src/platform/mailmypdf.ts");
    expect(adapter).toContain("process.env.MAILMYPDF_API_KEY");
    expect(adapter).not.toContain("import.meta.env.MAILMYPDF_API_KEY");
  });
});
