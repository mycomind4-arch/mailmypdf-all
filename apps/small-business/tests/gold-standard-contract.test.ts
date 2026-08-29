import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFile(resolve(root, path), "utf8");

describe("MailMyPDF Business Gold Standard contract", () => {
  it("has account-owned tenant policies and durable mailing intents", async () => {
    const sql = await read("supabase/migrations/002_gold_account_fulfillment.sql");
    expect(sql).toContain("mailing_intents");
    expect(sql).toContain("business_members");
    expect(sql).toContain("is_business_member");
    expect(sql).toContain("mailing_intents_member_all");
  });

  it("has a server-side authenticated Stripe checkout boundary", async () => {
    const auth = await read("functions/_auth.ts");
    const checkout = await read("functions/api/checkout.ts");
    expect(auth).toContain("/auth/v1/user");
    expect(checkout).toContain("requireAuthenticatedUser");
    expect(checkout).toContain("mailing_intents");
    expect(checkout).toContain("api.stripe.com/v1/checkout/sessions");
  });

  it("keeps Trigger.dev behind the MailMyPDF API boundary", async () => {
    const task = await read("trigger/tasks/execute-mail-job.ts");
    expect(task).toContain("MAILMYPDF_API_URL");
    expect(task).toContain("MAILMYPDF_API_KEY");
    expect(task).toContain("idempotency-key");
    expect(task).toContain("/v1/business/mail-jobs/");
  });
});
