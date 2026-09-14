import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { getWorkflowPricingProfileOrThrow } from "@mailmypdf/pricing";

/**
 * Insurance denials need a coverage-focused record, not a clone of either the
 * contractor or car-claim workflows. There is no generic timeline stage:
 * decision and appeal dates are confirmed in coverage analysis where they
 * affect the insurer's instructions.
 */
export const insuranceClaimDenialStepWorkflow: StepWorkflowDefinition = {
  id: "insurance-claim-denial",
  title: "Insurance Claim Denial",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "analysis", label: "Coverage analysis" },
    { id: "evidence", label: "Evidence" },
    { id: "payment", label: "Unlock draft" },
    { id: "review", label: "Final review" },
    { id: "mail", label: "Mail & proof" },
  ],
  requiresApprovalBeforeStep: "mail",
};

export type InsuranceClaimDenialIntake = {
  insurer?: string;
  claimNumber?: string;
  policyNumber?: string;
  decisionDate?: string;
  appealDeadline?: string;
  denialReason?: string;
  requestedOutcome?: string;
};

export function getInsuranceClaimDenialReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as InsuranceClaimDenialIntake;
  const files = (matter.steps.documents?.data.files as unknown[] | undefined) ?? [];
  return [
    { id: "insurer", label: "Insurer and claim number", done: Boolean(intake.insurer && intake.claimNumber) },
    { id: "policy", label: "Policy information", done: Boolean(intake.policyNumber) },
    { id: "decision", label: "Decision date and stated reason", done: Boolean(intake.decisionDate && intake.denialReason) },
    { id: "deadline", label: "Appeal deadline", done: Boolean(intake.appealDeadline) },
    { id: "documents", label: "Denial and supporting documents", done: files.length > 0 },
    { id: "outcome", label: "Requested outcome", done: Boolean(intake.requestedOutcome) },
  ];
}

const pricing = getWorkflowPricingProfileOrThrow("insurance-claim-denial");
export const insuranceClaimDenialMailingPackage = [
  { label: "Insurance claim appeal letter" },
  { label: "Coverage and evidence summary" },
  { label: "Supporting-document exhibits" },
  { label: `Preparation from $${(pricing.basePriceCents / 100).toFixed(2)} (includes ${pricing.includedPages} response pages)` },
  { label: "MailMyPDF delivery record and proof" },
];
