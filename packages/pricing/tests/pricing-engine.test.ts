/**
 * Pricing Engine Tests
 * Uses Node.js built-in test runner + assert
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQuote,
  getWorkflowPricingProfile,
  getProductionPricingProfiles,
  PRICES,
  getMailPrice,
  getMailSurcharge,
  getMailCost,
  getMailMargin,
  FULFILLMENT_COSTS,
  BAND_RANGES,
  estimateMargin,
  registerDiscount,
  serializeQuote,
  deserializeQuote,
  quotesMatch,
  type QuoteInput,
} from "../src/index.ts";

// ── Mail Pricing ──────────────────────────────────────────────────────────

describe("Mail pricing", () => {
  it("standard mail costs $4.99", () => {
    assert.equal(PRICES.standard, 499);
    assert.equal(getMailPrice("standard"), 499);
    assert.equal(getMailSurcharge("standard"), 0);
  });

  it("certified mail costs $14.94 total", () => {
    assert.equal(PRICES.certified, 1494);
    assert.equal(getMailSurcharge("certified"), 995);
    assert.equal(getMailPrice("certified"), 1494);
  });

  it("registered mail costs $32.49 total", () => {
    assert.equal(PRICES.registered, 3249);
    assert.equal(getMailSurcharge("registered"), 2750);
  });

  it("mail margins are positive for all classes", () => {
    assert.ok(getMailMargin("standard") > 0);
    assert.ok(getMailMargin("certified") > 0);
    assert.ok(getMailMargin("registered") > 0);
  });
});

// ── Quote Determinism ─────────────────────────────────────────────────────

describe("Quote determinism", () => {
  it("same inputs produce identical quotes", () => {
    const input: QuoteInput = {
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "certified",
    };
    const q1 = calculateQuote(input);
    const q2 = calculateQuote(input);
    assert.equal(q1.totalCents, q2.totalCents);
    assert.equal(q1.basePriceCents, q2.basePriceCents);
  });

  it("more pages cost more", () => {
    const base = { workflowId: "cp2000-response", verticalId: "notice-respond", mailClass: "standard" as const };
    const q5 = calculateQuote({ ...base, actualPages: 5 });
    const q15 = calculateQuote({ ...base, actualPages: 15 });
    assert.ok(q5.totalCents < q15.totalCents);
  });
});

// ── FREE Band ─────────────────────────────────────────────────────────────

describe("FREE band", () => {
  it("free workflow has $0 base price", () => {
    const quote = calculateQuote({
      workflowId: "mail-a-pdf",
      verticalId: "mailmypdf",
      actualPages: 1,
    });
    assert.equal(quote.basePriceCents, 0);
    assert.equal(quote.totalCents, 0);
  });

  it("free workflow with standard mail charges only for mail", () => {
    const quote = calculateQuote({
      workflowId: "mail-a-pdf",
      verticalId: "mailmypdf",
      actualPages: 1,
      mailClass: "standard",
    });
    assert.equal(quote.basePriceCents, 0);
    assert.equal(quote.mailServiceCost, 499);
    assert.equal(quote.totalCents, 499);
  });
});

// ── ESSENTIAL Band ────────────────────────────────────────────────────────

describe("ESSENTIAL band", () => {
  it("charges base price + mail", () => {
    const quote = calculateQuote({
      workflowId: "debt-validation",
      verticalId: "dispute-mail",
      actualPages: 3,
      mailClass: "standard",
    });
    assert.equal(quote.basePriceCents, 1499);
    assert.equal(quote.mailServiceCost, 499);
    assert.equal(quote.totalCents, 1499 + 499);
  });

  it("certified mail adds surcharge", () => {
    const quote = calculateQuote({
      workflowId: "billing-error",
      verticalId: "dispute-mail",
      actualPages: 2,
      mailClass: "certified",
    });
    assert.equal(quote.basePriceCents, 1499);
    assert.equal(quote.mailServiceCost, 499 + 995);
    assert.equal(quote.totalCents, 1499 + 499 + 995);
  });
});

// ── STANDARD Band ────────────────────────────────────────────────────────

describe("STANDARD band", () => {
  it("charges base + mail with no included pages", () => {
    const quote = calculateQuote({
      workflowId: "debt-collection-dispute",
      verticalId: "dispute-mail",
      actualPages: 3,
      mailClass: "standard",
    });
    assert.equal(quote.basePriceCents, 2999);
    assert.equal(quote.includedPages, 3);
    assert.equal(quote.mailServiceCost, 499);
    assert.equal(quote.totalCents, 2999 + 499);
  });
});

// ── ADVANCED Band ────────────────────────────────────────────────────────

describe("ADVANCED band", () => {
  it("includes standard mail up to 8 pages", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "standard",
    });
    assert.equal(quote.basePriceCents, 6999);
    assert.equal(quote.includedPages, 8);
    assert.equal(quote.mailServiceCost, 0);
    assert.equal(quote.extraPageCost, 0);
    assert.equal(quote.totalCents, 6999);
  });

  it("charges for pages beyond 8", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 15,
      mailClass: "standard",
    });
    assert.equal(quote.extraPageCost, 7 * 40);
    assert.equal(quote.totalCents, 6999 + 280);
  });

  it("certified mail charges upgrade", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "certified",
    });
    assert.equal(quote.mailServiceCost, 995);
    assert.equal(quote.totalCents, 6999 + 995);
  });

  it("registered mail charges upgrade", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "registered",
    });
    assert.equal(quote.mailServiceCost, 2750);
    assert.equal(quote.totalCents, 6999 + 2750);
  });
});

// ── Commercial Status Gating ──────────────────────────────────────────────

describe("Commercial status gating", () => {
  it("production workflows can be quoted", () => {
    assert.doesNotThrow(() => calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 1,
    }));
  });

  it("disabled workflows throw", () => {
    assert.throws(() => calculateQuote({
      workflowId: "tenant-reply",
      verticalId: "tenant-reply",
      actualPages: 1,
    }), /not available for purchase/);
  });

  it("unknown workflows throw", () => {
    assert.throws(() => calculateQuote({
      workflowId: "workflow-that-does-not-exist",
      verticalId: "records-requests",
      actualPages: 1,
    }), /pricing profile/i);
  });
});

// ── Capabilities ─────────────────────────────────────────────────────────

describe("Capabilities", () => {
  it("templates workflow is digital-only", () => {
    const profile = getWorkflowPricingProfile("templates");
    assert.equal(profile?.capabilities.basicMail, false);
    assert.equal(profile?.capabilities.certifiedMail, false);
  });

  it("unavailable mail service is ignored", () => {
    const quote = calculateQuote({
      workflowId: "templates",
      verticalId: "mailmypdf",
      actualPages: 1,
      mailClass: "certified",
    });
    assert.equal(quote.mailService, "none");
    assert.equal(quote.mailServiceCost, 0);
  });
});

// ── Discounts ────────────────────────────────────────────────────────────

describe("Discounts", () => {
  it("percentage discount applies correctly", () => {
    registerDiscount({
      code: "TEST10PCT",
      type: "percentage",
      value: 10,
      active: true,
    });
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "standard",
      discountCode: "TEST10PCT",
    });
    assert.equal(quote.discountCode, "TEST10PCT");
    assert.equal(quote.discountCents, Math.floor(6999 * 0.10));
    assert.equal(quote.totalCents, 6999 - 699);
  });

  it("invalid discount code is ignored", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 1,
      discountCode: "FAKE",
    });
    assert.equal(quote.discountCents, 0);
    assert.equal(quote.discountCode, null);
  });

  it("discount cannot exceed subtotal", () => {
    registerDiscount({
      code: "HUGE",
      type: "fixed",
      value: 999999,
      active: true,
    });
    const quote = calculateQuote({
      workflowId: "mail-a-pdf",
      verticalId: "mailmypdf",
      actualPages: 1,
      discountCode: "HUGE",
    });
    assert.equal(quote.totalCents, 0);
  });
});

// ── Quote Snapshot ────────────────────────────────────────────────────────

describe("Quote snapshot", () => {
  it("serialize/deserialize round-trips", () => {
    const original = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 10,
      mailClass: "certified",
    });
    const json = serializeQuote(original);
    const restored = deserializeQuote(json);
    assert.equal(restored.totalCents, original.totalCents);
    assert.equal(restored.workflowId, original.workflowId);
  });

  it("quotesMatch detects identical quotes", () => {
    const q1 = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "standard",
    });
    const q2 = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 5,
      mailClass: "standard",
    });
    assert.equal(quotesMatch(q1, q2), true);
  });
});

// ── Margin Analysis ───────────────────────────────────────────────────────

describe("Margin analysis", () => {
  it("advanced workflow with standard mail has healthy margin", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 8,
      mailClass: "standard",
    });
    const margin = estimateMargin(quote, 500);
    assert.ok(margin.grossMarginPercent > 70, `margin was ${margin.grossMarginPercent}%`);
  });

  it("advanced workflow with registered mail still profitable", () => {
    const quote = calculateQuote({
      workflowId: "cp2000-response",
      verticalId: "notice-respond",
      actualPages: 8,
      mailClass: "registered",
    });
    const margin = estimateMargin(quote, 500);
    assert.ok(margin.grossMarginPercent > 50, `margin was ${margin.grossMarginPercent}%`);
  });
});

// ── Catalog Integrity ────────────────────────────────────────────────────

describe("Catalog integrity", () => {
  it("every production workflow has a valid profile", () => {
    const production = getProductionPricingProfiles();
    assert.ok(production.length > 50, `expected >50 production profiles, got ${production.length}`);
    for (const p of production) {
      assert.ok(p.workflowId, "workflowId must exist");
      assert.ok(p.verticalId, "verticalId must exist");
      assert.ok(p.basePriceCents >= 0, "basePriceCents must be non-negative");
      assert.equal(p.currency, "usd");
      assert.equal(p.commercialStatus, "production");
    }
  });

  it("every profile price is within its band range", () => {
    for (const p of getProductionPricingProfiles()) {
      const range = BAND_RANGES[p.band];
      if (p.band === "FREE") {
        assert.equal(p.basePriceCents, 0);
      } else {
        assert.ok(p.basePriceCents >= range.min, `${p.workflowId} price ${p.basePriceCents} below band ${p.band} min ${range.min}`);
        assert.ok(p.basePriceCents <= range.max, `${p.workflowId} price ${p.basePriceCents} above band ${p.band} max ${range.max}`);
      }
    }
  });

  it("no duplicate workflow IDs", () => {
    const ids = new Set<string>();
    for (const p of getProductionPricingProfiles()) {
      assert.ok(!ids.has(p.workflowId), `duplicate workflowId: ${p.workflowId}`);
      ids.add(p.workflowId);
    }
  });
});
