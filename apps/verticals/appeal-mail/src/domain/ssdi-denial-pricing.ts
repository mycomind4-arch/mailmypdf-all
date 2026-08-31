export const SSDI_DENIAL_PRICING = {
  preparationFee: 24.99,
  includedResponsePages: 3,
  responsePagePrice: 0.40,
  supportingPagePrice: 0.25,
  standardMail: 5.49,
  certifiedMail: 12.49,
  registeredMail: 29.99,
  flatEnvelopeFee: 2.50,
} as const;

export function calculateSsdiDenialTotal(input: { responseSheets: number; supportingSheets: number; mailingMethod: "standard" | "certified" | "registered"; envelopeSurcharge?: boolean }) {
  const responseSheets = Math.max(1, Math.floor(input.responseSheets));
  const supportingSheets = Math.max(0, Math.floor(input.supportingSheets));
  const responsePrinting = Math.max(0, responseSheets - SSDI_DENIAL_PRICING.includedResponsePages) * SSDI_DENIAL_PRICING.responsePagePrice;
  const supportingPrinting = supportingSheets * SSDI_DENIAL_PRICING.supportingPagePrice;
  const mailing = input.mailingMethod === "standard" ? SSDI_DENIAL_PRICING.standardMail : input.mailingMethod === "certified" ? SSDI_DENIAL_PRICING.certifiedMail : SSDI_DENIAL_PRICING.registeredMail;
  const surcharge = input.envelopeSurcharge ? SSDI_DENIAL_PRICING.flatEnvelopeFee : 0;
  const total = SSDI_DENIAL_PRICING.preparationFee + responsePrinting + supportingPrinting + mailing + surcharge;
  return { responseSheets, supportingSheets, responsePrinting, supportingPrinting, mailing, surcharge, preparationFee: SSDI_DENIAL_PRICING.preparationFee, total: Number(total.toFixed(2)) };
}
