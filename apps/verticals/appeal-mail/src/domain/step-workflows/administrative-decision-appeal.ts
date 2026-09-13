import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { ADMINISTRATIVE_DECISION_APPEAL_PRICING } from "@/domain/administrative-decision-appeal-gold";

export const administrativeDecisionAppealStepWorkflow: StepWorkflowDefinition = {
  id: "administrative-decision-appeal",
  title: "Administrative Decision Appeal",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "analyze", label: "Analyze" },
    { id: "evidence", label: "Evidence" },
    { id: "timeline", label: "Timeline" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

/**
 * Intake fields collected in the "Matter intake" step — shape of
 * steps.intake.data. Field names mirror the JSON contract the existing
 * `/api/workflows/administrative-decision-appeal/analyze` endpoint already
 * extracts (issuer, jurisdiction, referenceNumber, decisionDate, deadline,
 * matterType) so a future wiring of that endpoint into this step maps
 * directly onto this shape.
 */
export type AdministrativeDecisionAppealIntake = {
  issuer?: string;
  jurisdiction?: string;
  referenceNumber?: string;
  decisionDate?: string;
  deadline?: string;
  matterType?: string;
  decisionSummary?: string;
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail is the same core-matter
 * completeness check on every screen — derived from the intake step's data,
 * not tied to whichever step is currently open (same pattern as Contractor
 * Dispute's and NOID Response's readiness lists).
 */
export function getAdministrativeDecisionAppealReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;
  return [
    { id: "issuer", label: "Decision-maker and jurisdiction", done: Boolean(intake.issuer && intake.jurisdiction) },
    {
      id: "reference",
      label: "Reference number and decision date",
      done: Boolean(intake.referenceNumber && intake.decisionDate),
    },
    { id: "deadline", label: "Appeal deadline", done: Boolean(intake.deadline) },
    { id: "matterType", label: "Matter type", done: Boolean(intake.matterType) },
    { id: "summary", label: "Decision summary", done: Boolean(intake.decisionSummary) },
    { id: "outcome", label: "Requested outcome", done: Boolean(intake.requestedOutcome) },
  ];
}

/**
 * The "Estimated mailing package" summary is the same across every screen.
 * Pulled from the real pricing profile (`ADMINISTRATIVE_DECISION_APPEAL_PRICING`,
 * from the Gold-standard domain file) rather than hardcoded numbers, so it
 * can't drift from what checkout actually charges.
 */
export const administrativeDecisionAppealMailingPackage = [
  { label: "Response letter" },
  { label: "Evidence summary" },
  { label: "Cited authority exhibits" },
  {
    label: `Preparation fee ($${ADMINISTRATIVE_DECISION_APPEAL_PRICING.preparationFee.toFixed(2)}, includes ${ADMINISTRATIVE_DECISION_APPEAL_PRICING.includedResponsePages} response pages)`,
  },
  { label: "Proof of delivery (certified mail)" },
];
