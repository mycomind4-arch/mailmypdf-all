import { PRICES } from "@mailmypdf/pricing";

// This is the legacy "administrative-decision" workflow (distinct from the
// canonical "administrative-decision-appeal" Gold workflow, which has its
// own profile in @mailmypdf/pricing and its own pricing module). No
// canonical pricing profile exists for this workflow ID, so preparation fee
// and per-page rates stay as fixed literals here rather than being derived
// from a (nonexistent) profile — but mail pricing still comes from the
// shared PRICES table so it can't drift from the canonical mail rates.
export const ADMINISTRATIVE_DECISION_PRICING = {
  preparationFee: 24.99,
  includedResponsePages: 3,
  responsePagePrice: 0.40,
  supportingPagePrice: 0.25,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
  flatEnvelopeFee: 0,
} as const;

export function calculateAdministrativeDecisionTotal(input: {
  responseSheets: number;
  supportingSheets: number;
  mailingMethod: "standard" | "certified" | "registered";
  envelopeSurcharge?: boolean;
}) {
  const responseSheets = Math.max(1, Math.floor(input.responseSheets));
  const supportingSheets = Math.max(0, Math.floor(input.supportingSheets));
  const responsePrinting = Math.max(0, responseSheets - ADMINISTRATIVE_DECISION_PRICING.includedResponsePages) * ADMINISTRATIVE_DECISION_PRICING.responsePagePrice;
  const supportingPrinting = supportingSheets * ADMINISTRATIVE_DECISION_PRICING.supportingPagePrice;
  const mailing = input.mailingMethod === "standard" ? ADMINISTRATIVE_DECISION_PRICING.standardMail : input.mailingMethod === "certified" ? ADMINISTRATIVE_DECISION_PRICING.certifiedMail : ADMINISTRATIVE_DECISION_PRICING.registeredMail;
  const surcharge = input.envelopeSurcharge ? ADMINISTRATIVE_DECISION_PRICING.flatEnvelopeFee : 0;
  const total = ADMINISTRATIVE_DECISION_PRICING.preparationFee + responsePrinting + supportingPrinting + mailing + surcharge;
  return { preparationFee: ADMINISTRATIVE_DECISION_PRICING.preparationFee, responseSheets, supportingSheets, responsePrinting, supportingPrinting, mailing, surcharge, total: Number(total.toFixed(2)) };
}
