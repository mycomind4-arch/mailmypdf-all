import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";
import { BUREAU_CONFIGS } from "../../shared/credit-dispute";

/**
 * Ported from apps/verticals/notice-respond/src/domain/step-workflows/transunion-dispute.ts.
 * Same six-step shape as the other two bureau workflows: one recipient
 * (TransUnion), a report that commonly carries several disputed tradelines
 * each needing its own FCRA category and evidence, and a single 30/45-day
 * FCRA Section 611 reinvestigation clock (not a hearing schedule).
 */
export const transunionDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "transunion-dispute",
  title: "TransUnion Dispute",
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

export const TRANSUNION_BUREAU_CONFIG = BUREAU_CONFIGS.transunion;

const _p = getWorkflowPricingProfile("transunion-dispute")!;

export const TRANSUNION_DISPUTE_PRICING = {
  preparationFee: _p.basePriceCents / 100,
  includedResponsePages: _p.includedPages,
  responsePagePrice: (_p.extraPageRateCents || 0) / 100,
  supportingPagePrice: (_p.supportingPageRateCents || 0) / 100,
  standardMail: PRICES.standard / 100,
  certifiedMail: PRICES.certified / 100,
  registeredMail: PRICES.registered / 100,
} as const;

export const transunionDisputeMailingPackage = [
  { label: "FCRA dispute letter to TransUnion's Consumer Dispute Center, P.O. Box 2000, Chester, PA 19016" },
  { label: "Itemized list of disputed accounts with FCRA dispute categories" },
  { label: "Supporting evidence (proof of identity, statements, payment records)" },
  { label: `Preparation fee ($${TRANSUNION_DISPUTE_PRICING.preparationFee.toFixed(2)}, includes ${TRANSUNION_DISPUTE_PRICING.includedResponsePages} response pages)` },
  { label: "Proof of delivery (certified mail recommended to start the FCRA 30-day clock)" },
];
