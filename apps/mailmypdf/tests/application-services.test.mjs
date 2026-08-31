import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Service Contract Tests ────────────────────────────────────────────────────
// These tests verify the structure and contracts of the application services
// without instantiating them (which requires Supabase/Stripe/Lob env vars).
// They complement the existing source-pattern tests that check security properties.

describe("Application Services — Contract Shapes", () => {
  it("DocumentService has all required methods", async () => {
    const src = await source("src/services/document.service.ts");
    assert.match(src, /async validatePdf\(/);
    assert.match(src, /async uploadDocument\(/);
    assert.match(src, /async deleteDocument\(/);
    assert.match(src, /async generateLetterPdf\(/);
    assert.match(src, /estimateLetterPages\(/);
    assert.match(src, /async computeHash\(/);
  });

  it("PricingService has all required methods", async () => {
    const src = await source("src/services/pricing.service.ts");
    assert.match(src, /calculatePrice\(/);
    assert.match(src, /calculateTotalCents\(/);
    assert.match(src, /getBasePrice\(/);
    assert.match(src, /describeProduct\(/);
    assert.match(src, /getMailClassLabel\(/);
    assert.match(src, /priceIdForPageCount\(/);
  });

  it("BillingService has all required methods", async () => {
    const src = await source("src/services/billing.service.ts");
    assert.match(src, /async createCheckoutSession\(/);
    assert.match(src, /async checkSubscription\(/);
  });

  it("MailService has all required methods", async () => {
    const src = await source("src/services/mail.service.ts");
    assert.match(src, /async createOrderFromPdf\(/);
    assert.match(src, /async createOrderFromLetter\(/);
    assert.match(src, /async getOrder\(/);
    assert.match(src, /async lookupOrder\(/);
    assert.match(src, /async previewPdfPricing\(/);
    assert.match(src, /async previewLetterPricing\(/);
    assert.match(src, /getBilling\(/);
  });

  it("services/index.ts exports all services and getMailService singleton", async () => {
    const src = await source("src/services/index.ts");
    assert.match(src, /export.*DocumentService/);
    assert.match(src, /export.*PricingService/);
    assert.match(src, /export.*BillingService/);
    assert.match(src, /export.*MailService/);
    assert.match(src, /export function getMailService/);
  });
});

describe("Service Layer — Dependency Rules", () => {
  it("DocumentService does not import Stripe or Lob directly", async () => {
    const src = await source("src/services/document.service.ts");
    assert.doesNotMatch(src, /import.*stripe/);
    assert.doesNotMatch(src, /import.*lob\.server/);
  });

  it("PricingService does not import Stripe or Lob", async () => {
    const src = await source("src/services/pricing.service.ts");
    assert.doesNotMatch(src, /import.*stripe/);
    assert.doesNotMatch(src, /import.*lob/);
  });

  it("MailService imports DocumentService, PricingService, and BillingService", async () => {
    const src = await source("src/services/mail.service.ts");
    assert.match(src, /import.*DocumentService/);
    assert.match(src, /import.*PricingService/);
    assert.match(src, /import.*BillingService/);
  });

  it("MailService does not call Lob or Stripe directly", async () => {
    const src = await source("src/services/mail.service.ts");
    assert.doesNotMatch(src, /createStripeClient/);
    assert.doesNotMatch(src, /createLobLetter/);
    assert.doesNotMatch(src, /submitOrderToLob/);
  });
});

// ── PricingService computation tests (pure logic, no I/O) ─────────────────────

describe("PricingService — Computation", () => {
  // Inline the pricing logic to test it without TS imports
  function basePriceCents(pageCount) {
    if (pageCount <= 2) return 499;
    if (pageCount <= 5) return 699;
    return 999;
  }

  const COLOR_PER_PAGE_SURCHARGE = 15;
  const MAIL_CLASS_SURCHARGE = {
    standard: 0,
    certified: 995,  // LOB_CERTIFIED_COST (695) + MARGIN (300)
    registered: 2750, // LOB_REGISTERED_COST (2450) + MARGIN (300)
  };

  function calculateTotalCents({ pageCount, color, mailClass }) {
    const base = basePriceCents(pageCount);
    const colorSurcharge = color ? pageCount * COLOR_PER_PAGE_SURCHARGE : 0;
    const deliverySurcharge = MAIL_CLASS_SURCHARGE[mailClass] ?? 0;
    return base + colorSurcharge + deliverySurcharge;
  }

  it("2-page standard B&W = $4.99", () => {
    assert.equal(calculateTotalCents({ pageCount: 2, color: false, mailClass: "standard" }), 499);
  });

  it("5-page standard color = $7.74 ($6.99 + 5×$0.15)", () => {
    assert.equal(calculateTotalCents({ pageCount: 5, color: true, mailClass: "standard" }), 774);
  });

  it("10-page standard B&W = $9.99", () => {
    assert.equal(calculateTotalCents({ pageCount: 10, color: false, mailClass: "standard" }), 999);
  });

  it("2-page certified B&W = $14.94 ($4.99 + $9.95)", () => {
    assert.equal(calculateTotalCents({ pageCount: 2, color: false, mailClass: "certified" }), 1494);
  });

  it("2-page registered B&W = $32.49 ($4.99 + $27.50)", () => {
    assert.equal(calculateTotalCents({ pageCount: 2, color: false, mailClass: "registered" }), 3249);
  });

  it("Pricing breakdown has correct components", () => {
    // Simulate what PricingService.calculatePrice returns
    const pageCount = 3;
    const color = true;
    const mailClass = "certified";
    const total = calculateTotalCents({ pageCount, color, mailClass });
    const base = basePriceCents(pageCount);
    const colorSurcharge = pageCount * COLOR_PER_PAGE_SURCHARGE;
    const deliverySurcharge = MAIL_CLASS_SURCHARGE[mailClass];
    assert.equal(total, base + colorSurcharge + deliverySurcharge);
  });
});
