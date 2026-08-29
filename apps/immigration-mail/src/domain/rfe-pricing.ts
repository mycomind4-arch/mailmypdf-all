/**
 * RFE Pricing Engine
 *
 * Pricing is delegated to the canonical @mailmypdf/pricing engine.
 * Local pricing constants have been removed.
 * Utility types and helpers are kept for backward compatibility.
 */

import { calculateQuote, LABELS, type MailClass } from "@mailmypdf/pricing";

import type { MailingMethod } from './rfe-workflow';

export type ComplexityTier = 'basic' | 'standard' | 'complex';

export interface PricingTier {
  name: string;
  description: string;
  servicePrice: number;
  maxDocuments: number;
  maxEvidenceItems: number;
}

export const PRICING_TIERS: Record<ComplexityTier, PricingTier> = {
  basic: { name: 'Basic', description: 'Simple RFE response with 1-3 evidence items.', servicePrice: 39, maxDocuments: 5, maxEvidenceItems: 3 },
  standard: { name: 'Standard', description: 'Standard RFE response with 4-10 evidence items.', servicePrice: 59, maxDocuments: 15, maxEvidenceItems: 10 },
  complex: { name: 'Complex', description: 'Complex RFE response with 10+ evidence items or multiple issues.', servicePrice: 99, maxDocuments: 50, maxEvidenceItems: 20 },
};

export const POSTAGE_RATES: Record<MailingMethod, { base: number; perOunce: number; description: string }> = {
  standard: { base: 0.73, perOunce: 0.28, description: 'First-Class Mail. No tracking included.' },
  certified: { base: 4.85, perOunce: 0.28, description: 'Certified Mail with tracking and proof of mailing.' },
  registered: { base: 17.50, perOunce: 0.28, description: 'Registered Mail with maximum security and insurance.' },
};

export interface AddOnService { id: string; name: string; description: string; price: number; }

export const AVAILABLE_ADDONS: AddOnService[] = [
  { id: 'return_receipt', name: 'Return Receipt', description: 'Electronic return receipt with signature capture.', price: 2.85 },
  { id: 'restricted_delivery', name: 'Restricted Delivery', description: 'Only the addressee or authorized agent can receive the mail.', price: 7.10 },
  { id: 'insurance', name: 'Insurance', description: 'Up to $500 insurance for valuable documents.', price: 3.50 },
  { id: 'expedited_review', name: 'Expedited AI Review', description: 'Priority processing with faster turnaround.', price: 20 },
  { id: 'extra_copies', name: 'Additional Copies', description: 'Extra printed copies of your response packet.', price: 5 },
];

export interface PricingInput {
  complexity: ComplexityTier;
  mailingMethod: MailingMethod;
  documentCount: number;
  estimatedWeightOunces: number;
  selectedAddOns: string[];
  taxRate?: number;
}

export interface PricingResult {
  servicePrice: number;
  postage: number;
  addOns: { id: string; name: string; price: number; description: string }[];
  addOnsTotal: number;
  tax: number;
  total: number;
  mailingMethod: MailingMethod;
  currency: string;
  breakdown: { label: string; amount: number; isPostage: boolean }[];
  tierName: string;
  tierDescription: string;
}

export function calculatePricing(input: PricingInput): PricingResult {
  // Delegate to canonical @mailmypdf/pricing engine
  const mailClass = input.mailingMethod as MailClass;
  const quote = calculateQuote({
    workflowId: "rfe",
    verticalId: "immigration-mail",
    actualPages: Math.max(1, Math.ceil((input.estimatedWeightOunces || 1) / 2)),
    mailClass,
  });

  const servicePrice = quote.basePriceCents / 100;
  const postage = quote.mailCents / 100;
  const total = quote.totalCents / 100;

  const tier = PRICING_TIERS[input.complexity];
  const addOns = input.selectedAddOns
    .map(id => AVAILABLE_ADDONS.find(a => a.id === id))
    .filter((a): a is AddOnService => a !== undefined)
    .map(a => ({ id: a.id, name: a.name, price: a.price, description: a.description }));
  const addOnsTotal = addOns.reduce((s, a) => s + a.price, 0);
  const taxRate = input.taxRate ?? 0;
  const tax = +((servicePrice + addOnsTotal) * taxRate).toFixed(2);
  const grandTotal = +(total + addOnsTotal + tax).toFixed(2);

  return {
    servicePrice, postage, addOns, addOnsTotal, tax, total: grandTotal,
    mailingMethod: input.mailingMethod, currency: 'USD',
    breakdown: [
      { label: `${tier.name} Service`, amount: servicePrice, isPostage: false },
      { label: LABELS[mailClass] || 'Mailing', amount: postage, isPostage: true },
      ...addOns.map(a => ({ label: a.name, amount: a.price, isPostage: false })),
      ...(tax > 0 ? [{ label: 'Tax', amount: tax, isPostage: false }] : []),
    ],
    tierName: tier.name, tierDescription: tier.description,
  };
}

export function determineComplexity(evidenceItemCount: number, hasConflicts: boolean, _formType: string): ComplexityTier {
  if (hasConflicts || evidenceItemCount > 10) return 'complex';
  if (evidenceItemCount > 3) return 'standard';
  return 'basic';
}

export function estimateWeight(documentCount: number): number {
  return Math.max(1, Math.ceil(documentCount * 5 * 0.5));
}
