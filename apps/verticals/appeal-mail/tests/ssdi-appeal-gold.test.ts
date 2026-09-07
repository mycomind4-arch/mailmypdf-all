import assert from "node:assert/strict";
import test from "node:test";
import { SSDI_APPEAL_GOLD, SSDI_APPEAL_PRICING } from "../src/domain/ssdi-appeal-gold.ts";

test("SSDI Gold contract includes intelligence, validation, approval, pricing, mailing and proof", () => {
  assert.equal(SSDI_APPEAL_GOLD.workflowId, "ssdi-appeal");
  assert.equal(SSDI_APPEAL_GOLD.lifecycle, "authority");
  assert.ok(SSDI_APPEAL_GOLD.capabilities.includes("independent-validation"));
  assert.ok(SSDI_APPEAL_GOLD.capabilities.includes("pricing"));
  assert.ok(SSDI_APPEAL_GOLD.capabilities.includes("proof"));
  assert.ok(SSDI_APPEAL_GOLD.authorityRules.includes("Never invent medical facts."));
  // Derived from the canonical @mailmypdf/pricing profile for "ssdi-appeal"
  // ($69.99 base, 8 included pages), not the pre-migration $29.99/4.
  assert.equal(SSDI_APPEAL_PRICING.includedResponsePages, 8);
  assert.equal(SSDI_APPEAL_PRICING.preparationFee, 69.99);
});

test("SSDI executable boundaries are wired", async () => {
  const fs = await import("node:fs/promises");
  const files = await Promise.all([
    fs.readFile("src/routes/workflows/ssdi-appeal.tsx", "utf8"),
    fs.readFile("src/routes/api/workflows/ssdi-appeal/analyze.ts", "utf8"),
    fs.readFile("src/routes/api/workflows/ssdi-appeal/draft.ts", "utf8"),
    fs.readFile("src/routes/api/workflows/ssdi-appeal/validate.ts", "utf8"),
    fs.readFile("src/routes/api/workflows/ssdi-appeal/approve.ts", "utf8"),
    fs.readFile("src/routes/api/workflows/ssdi-appeal/checkout.ts", "utf8"),
    fs.readFile("src/routes/api/stripe-webhook.ts", "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /ssdi-appeal/);
  assert.match(source, /Gemini/);
  assert.match(source, /MailMyPDF/);
  assert.match(source, /proof/);
  assert.match(source, /69\.99/);
  assert.match(source, /validation/);
});
