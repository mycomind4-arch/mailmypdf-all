import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";

// Canonical pricing profile for "car-insurance-appeal" (STANDARD band, $39.99
// preparation fee, 3 included response pages) already exists in
// @mailmypdf/pricing and is what /api/workflows/car-insurance-appeal/checkout
// actually charges via calculateQuote(). This module derives the same
// display-friendly shape used by every other Gold workflow's own pricing
// module (see reconsideration-pricing.ts, administrative-decision-appeal-gold.ts)
// so the step-workflow UI can show real numbers instead of hardcoding a
// second copy of them.
const _p = getWorkflowPricingProfile("car-insurance-appeal")!;

export const CAR_INSURANCE_APPEAL_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageRateCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageRateCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
  flatEnvelopeFee: 0,
} as const;
