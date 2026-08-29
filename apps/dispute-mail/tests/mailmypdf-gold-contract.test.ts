import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFile(resolve(root, path), "utf8");

describe("Dispute Mail Gold fulfillment contract", () => {
  it("uses canonical MailMyPDF endpoints and preserves multipart boundaries", async () => {
    const source = await read("src/platform/mailmypdf.ts");
    expect(source).toContain("/v1/documents");
    expect(source).toContain("/v1/communications");
    expect(source).toContain("!(init.body instanceof FormData)");
    expect(source).toContain("Idempotency-Key");
  });

  it("requires authentication and verified payment before physical mailing", async () => {
    const checkout = await read("server/api/checkout.ts");
    const fulfillment = await read("server/api/mail/response.ts");
    expect(checkout).toContain("requireAuthenticatedUser");
    expect(checkout).toContain("mailing_intents");
    expect(checkout).toContain("stripe.checkout.sessions.create");
    expect(fulfillment).toContain("requireAuthenticatedUser");
    expect(fulfillment).toContain('session.payment_status !== "paid"');
    expect(fulfillment).toContain("stripe:");
  });

  it("locks ownership policies on dispute cases, evidence, events, and mailing intents", async () => {
    const sql = await read("supabase/migrations/20260821_gold_fulfillment.sql");
    expect(sql).toContain("dispute_cases_select_own");
    expect(sql).toContain("dispute_case_evidence_select_own");
    expect(sql).toContain("dispute_case_events_select_own");
    expect(sql).toContain("dispute_mailing_intents_select_own");
  });

  it("places payment after human approval and draft validation in the workflow UI", async () => {
    const source = await read("src/components/dispute-mail-funnel.tsx");
    expect(source).toContain("draftValidated");
    expect(source).toContain("approved");
    expect(source).toContain("/api/checkout");
    expect(source).toContain("Pay and send");
  });
});
