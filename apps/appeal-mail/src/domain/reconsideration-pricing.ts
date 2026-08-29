import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
const _p = getWorkflowPricingProfile("reconsideration")!;
export const RECONSIDERATION_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
  flatEnvelopeFee: 0,
  largePacketThresholdSheets: 0,
} as const;

export function calculateReconsiderationTotal(input: { responseSheets: number; supportingSheets: number; mailingMethod: "standard" | "certified" | "registered"; envelopeSurcharge?: boolean }) {
  const responseSheets = Math.max(1, Math.floor(input.responseSheets));
  const supportingSheets = Math.max(0, Math.floor(input.supportingSheets));
  const responsePrinting = Math.max(0, responseSheets - RECONSIDERATION_PRICING.includedResponsePages) * RECONSIDERATION_PRICING.responsePagePrice;
  const supportingPrinting = supportingSheets * RECONSIDERATION_PRICING.supportingPagePrice;
  const mailing = input.mailingMethod === "standard" ? RECONSIDERATION_PRICING.standardMail : input.mailingMethod === "certified" ? RECONSIDERATION_PRICING.certifiedMail : RECONSIDERATION_PRICING.registeredMail;
  const surcharge = input.envelopeSurcharge || responseSheets + supportingSheets >= RECONSIDERATION_PRICING.largePacketThresholdSheets ? RECONSIDERATION_PRICING.flatEnvelopeFee : 0;
  const total = RECONSIDERATION_PRICING.preparationFee + responsePrinting + supportingPrinting + mailing + surcharge;
  return { preparationFee: RECONSIDERATION_PRICING.preparationFee, responseSheets, supportingSheets, responsePrinting, supportingPrinting, mailing, surcharge, total: Number(total.toFixed(2)) };
}
