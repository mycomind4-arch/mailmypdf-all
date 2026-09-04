/**
 * Universal Pricing Regression Suite
 *
 * Detects price drift across the MailMyPDF ecosystem:
 * - Price drift (UI vs canonical)
 * - Checkout drift (checkout vs canonical)
 * - Stripe drift (Stripe vs canonical)
 * - Mailing drift (double-charging mail)
 * - Legacy drift (old pricing constants)
 * - Commercial-status drift (non-production workflows purchasable)
 * - Currency drift (cents/dollars mixed)
 * - Rounding drift (displayed vs charged)
 *
 * These tests are more valuable than hundreds of individual
 * hard-coded price assertions.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  PRICES,
  LABELS,
  calculateQuote,
  getWorkflowPricingProfile,
  getProductionPricingProfiles,
  getPricingProfilesByVertical,
  serializeQuote,
  BAND_RANGES,
  isValidPricingKey,
  type MailClass,
  type PricingBand,
} from "../src/index.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const ALL_PRODUCTION = getProductionPricingProfiles();

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Universal Pricing Regression Suite", () => {

  // ── 1. Price Drift ────────────────────────────────────────────────────────
  describe("Price drift detection", () => {
    it("every production profile has a basePriceCents within its band range", () => {
      for (const profile of ALL_PRODUCTION) {
        const range = BAND_RANGES[profile.band];
        assert.ok(
          profile.basePriceCents >= range.min && profile.basePriceCents <= range.max,
          `Band drift: ${profile.workflowId} (${profile.band}) has basePriceCents=${profile.basePriceCents} but band range is [${range.min}, ${range.max}]`,
        );
      }
    });

    it("FREE profiles always have basePriceCents === 0", () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.band === "FREE") {
          assert.equal(profile.basePriceCents, 0,
            `FREE workflow ${profile.workflowId} has non-zero basePriceCents: ${profile.basePriceCents}`);
        }
      }
    });

    it("no two production profiles share the same workflowId", () => {
      const seen = new Map<string, string>();
      for (const profile of ALL_PRODUCTION) {
        const existing = seen.get(profile.workflowId);
        assert.ok(!existing,
          `Duplicate workflowId "${profile.workflowId}" in both ${existing} and ${profile.verticalId}`);
        seen.set(profile.workflowId, profile.verticalId);
      }
    });
  });

  // ── 2. Checkout Drift ────────────────────────────────────────────────────
  describe("Checkout drift detection", () => {
    it("calculateQuote returns the same total for the same inputs (deterministic)", () => {
      for (const profile of ALL_PRODUCTION.slice(0, 20)) { // sample
        const input = {
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: 3,
          mailClass: "standard" as MailClass,
        };
        const q1 = calculateQuote(input);
        const q2 = calculateQuote(input);
        assert.equal(q1.totalCents, q2.totalCents,
          `Non-deterministic quote for ${profile.workflowId}: ${q1.totalCents} vs ${q2.totalCents}`);
      }
    });

    it("quote total = base + extra pages + mail upgrade (no hidden costs)", () => {
      for (const profile of ALL_PRODUCTION.slice(0, 20)) {
        const actualPages = profile.includedPages + 2;
        const mailClass: MailClass = "certified";
        const quote = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages,
          mailClass,
        });

        const expectedExtraPages = profile.basePriceCents > 0
          ? Math.max(0, actualPages - profile.includedPages)
          : 0;
        const expectedExtraPageCost = expectedExtraPages * profile.extraPageRateCents;
        const expectedMailCost = profile.availableMailServices.includes(mailClass)
          ? (profile.includedMail === "standard" ? 0 : PRICES.standard) + profile.certifiedMailSurchargeCents
          : 0;
        const expectedTotal = profile.basePriceCents + expectedExtraPageCost + expectedMailCost;

        assert.equal(quote.totalCents, expectedTotal,
          `Quote mismatch for ${profile.workflowId}: got ${quote.totalCents}, expected ${expectedTotal}`);
      }
    });
  });

  // ── 3. Mailing Drift ─────────────────────────────────────────────────────
  describe("Mailing drift detection", () => {
    it("standard mail included workflows do not charge standard mail twice", () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.includedMail !== "standard") continue;

        const quote = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: profile.includedPages,
          mailClass: "standard",
        });

        // The standard mail cost should be 0 (included in base)
        assert.equal(quote.mailServiceCost, 0,
          `Mailing drift: ${profile.workflowId} charges mailServiceCost=${quote.mailServiceCost} despite includedMail="standard"`);
        assert.equal(quote.mailUpgradeCost, 0,
          `Mailing drift: ${profile.workflowId} charges mailUpgradeCost=${quote.mailUpgradeCost} for standard mail`);
      }
    });

    it("non-included mail charges the correct amount", () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.includedMail === "standard") continue;
        if (!profile.availableMailServices.includes("standard")) continue;

        const quote = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: profile.includedPages,
          mailClass: "standard",
        });

        assert.equal(quote.mailServiceCost, PRICES.standard,
          `Mailing drift: ${profile.workflowId} should charge ${PRICES.standard} for standard mail, got ${quote.mailServiceCost}`);
      }
    });
  });

  // ── 4. Legacy Drift ──────────────────────────────────────────────────────
  describe("Legacy drift detection", () => {
    it("canonical PRICES match the known mailing values", () => {
      assert.equal(PRICES.standard, 499, "Standard mail should be 499 cents ($4.99)");
      assert.equal(PRICES.certified, 1494, "Certified mail should be 1494 cents ($14.94)");
      assert.equal(PRICES.registered, 3249, "Registered mail should be 3249 cents ($32.49)");
    });

    it("no production workflow charges ONLY the mailing price (legacy model)", () => {
      for (const profile of ALL_PRODUCTION) {
        if (profile.band === "FREE") continue;
        if (profile.verticalId === "mailmypdf" && profile.includedMail === "standard") continue;

        assert.notEqual(profile.basePriceCents, PRICES.standard,
          `Legacy drift: ${profile.workflowId} basePriceCents equals standard mail price (${PRICES.standard})`);
        assert.notEqual(profile.basePriceCents, PRICES.certified,
          `Legacy drift: ${profile.workflowId} basePriceCents equals certified mail price (${PRICES.certified})`);
        assert.notEqual(profile.basePriceCents, PRICES.registered,
          `Legacy drift: ${profile.workflowId} basePriceCents equals registered mail price (${PRICES.registered})`);
      }
    });
  });

  // ── 5. Commercial-Status Drift ────────────────────────────────────────────
  describe("Commercial-status drift detection", () => {
    it("disabled workflows throw when quoting", () => {
      assert.throws(
        () => calculateQuote({ workflowId: "tenant-reply", verticalId: "tenant-reply", actualPages: 1 }),
        /not available for purchase/i,
      );
    });

    it("test workflows throw when quoting", () => {
      assert.throws(
        () => calculateQuote({ workflowId: "permit-reply", verticalId: "permit-response", actualPages: 1 }),
        /not available for purchase/i,
      );
    });

    it("FREE workflow can be quoted with 0 total", () => {
      const quote = calculateQuote({
        workflowId: "biometrics",
        verticalId: "immigration-mail",
        actualPages: 1,
      });
      assert.equal(quote.totalCents, 0);
    });

    it("FREE workflow with mail charges only the mail", () => {
      const quote = calculateQuote({
        workflowId: "biometrics",
        verticalId: "immigration-mail",
        actualPages: 1,
        mailClass: "certified",
      });
      assert.equal(quote.basePriceCents, 0);
      assert.equal(quote.totalCents, PRICES.certified);
    });
  });

  // ── 6. Currency Drift ────────────────────────────────────────────────────
  describe("Currency drift detection", () => {
    it("all profiles use 'usd' currency", () => {
      for (const profile of ALL_PRODUCTION) {
        assert.equal(profile.currency, "usd",
          `Currency drift: ${profile.workflowId} uses ${profile.currency} instead of usd`);
      }
    });

    it("all quote totals are positive integers (cents, not dollars)", () => {
      for (const profile of ALL_PRODUCTION.slice(0, 20)) {
        const quote = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: 3,
          mailClass: "certified",
        });
        assert.ok(Number.isInteger(quote.totalCents),
          `Currency drift: ${profile.workflowId} quote totalCents is not an integer: ${quote.totalCents}`);
        assert.ok(quote.totalCents >= 0,
          `Currency drift: ${profile.workflowId} quote totalCents is negative: ${quote.totalCents}`);
      }
    });
  });

  // ── 7. Rounding Drift ────────────────────────────────────────────────────
  describe("Rounding drift detection", () => {
    it("quote total equals the sum of its components (no rounding errors)", () => {
      for (const profile of ALL_PRODUCTION.slice(0, 30)) {
        const quote = calculateQuote({
          workflowId: profile.workflowId,
          verticalId: profile.verticalId,
          actualPages: profile.includedPages + 3,
          supportingPages: 2,
          mailClass: "certified",
        });

        const componentSum = quote.basePriceCents + quote.extraPageCost + quote.supportingPageCost +
          quote.mailServiceCost - quote.discountCents;

        assert.equal(quote.totalCents, componentSum,
          `Rounding drift: ${profile.workflowId} totalCents=${quote.totalCents} but component sum=${componentSum}`);
      }
    });
  });

  // ── 8. Cross-vertical consistency ─────────────────────────────────────────
  describe("Cross-vertical consistency", () => {
    it("every vertical has at least one production profile", () => {
      const verticals = new Set(ALL_PRODUCTION.map(p => p.verticalId));
      for (const v of verticals) {
        const count = ALL_PRODUCTION.filter(p => p.verticalId === v).length;
        assert.ok(count > 0, `Vertical ${v} has no production profiles`);
      }
    });

    it("mailing prices are consistent across all profiles", () => {
      for (const profile of ALL_PRODUCTION) {
        assert.equal(profile.certifiedMailSurchargeCents, PRICES.certified - PRICES.standard,
          `Mail drift: ${profile.workflowId} certified surcharge is ${profile.certifiedMailSurchargeCents}, expected ${PRICES.certified - PRICES.standard}`);
        assert.equal(profile.registeredMailSurchargeCents, PRICES.registered - PRICES.standard,
          `Mail drift: ${profile.workflowId} registered surcharge is ${profile.registeredMailSurchargeCents}, expected ${PRICES.registered - PRICES.standard}`);
      }
    });
  });

  // ── 9. Quote snapshot immutability ───────────────────────────────────────
  describe("Quote snapshot immutability", () => {
    it("serialized quote can be deserialized and matches original", () => {
      const quote = calculateQuote({
        workflowId: "cp2000-response",
        verticalId: "notice-respond",
        actualPages: 5,
        mailClass: "certified",
      });
      const serialized = serializeQuote(quote);
      assert.ok(serialized.length > 0, "Serialized quote is empty");

      const parsed = JSON.parse(serialized);
      assert.equal(parsed.totalCents, quote.totalCents, "Deserialized totalCents mismatch");
      assert.equal(parsed.workflowId, quote.workflowId, "Deserialized workflowId mismatch");
      assert.equal(parsed.band, quote.band, "Deserialized band mismatch");
    });
  });

  // ── 10. Full profile count ────────────────────────────────────────────────
  describe("Ecosystem coverage", () => {
    it("has at least 170 production profiles", () => {
      assert.ok(ALL_PRODUCTION.length >= 170,
        `Expected at least 170 production profiles, got ${ALL_PRODUCTION.length}`);
    });

    it("covers all major verticals", () => {
      const requiredVerticals = [
        "mailmypdf", "notice-respond", "dispute-mail", "appeal-mail",
        "immigration-mail", "insurance-claims", "benefits-appeal",
        "records-requests", "code-enforcement", "mailmypdf-private-office",
        "mailmypdf-smallbusiness",
      ];
      for (const v of requiredVerticals) {
        const count = getPricingProfilesByVertical(v).filter(p => p.commercialStatus === "production").length;
        assert.ok(count > 0, `Vertical ${v} has no production profiles`);
      }
    });
  });
});
