import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { BUREAU_CONFIGS } from "../../shared/credit-dispute";

/**
 * Ported from apps/verticals/notice-respond/src/domain/step-workflows/experian-dispute.ts.
 * Same six-step shape as the other two bureau workflows: one recipient
 * (Experian), a report that commonly carries several disputed tradelines
 * each needing its own FCRA category and evidence, and a single 30/45-day
 * FCRA Section 611 reinvestigation clock (not a hearing schedule).
 */
export const experianDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "experian-dispute",
  title: "Experian Dispute",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "analyze", label: "Analyze" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

export const EXPERIAN_BUREAU_CONFIG = BUREAU_CONFIGS.experian;

const _p = getWorkflowPricingProfile("experian-dispute")!;

export const EXPERIAN_DISPUTE_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageRateCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageRateCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
} as const;

export const experianDisputeMailingPackage = [
  { label: "FCRA dispute letter to Experian's National Consumer Assistance Center, P.O. Box 4500, Allen, TX 75013" },
  { label: "Itemized list of disputed accounts with FCRA dispute categories" },
  { label: "Supporting evidence (proof of identity, statements, payment records)" },
  { label: `Preparation fee ($${EXPERIAN_DISPUTE_PRICING.preparationFee.toFixed(2)}, includes ${EXPERIAN_DISPUTE_PRICING.includedResponsePages} response pages)` },
  { label: "Proof of delivery (certified mail recommended to start the FCRA 30-day clock)" },
];
