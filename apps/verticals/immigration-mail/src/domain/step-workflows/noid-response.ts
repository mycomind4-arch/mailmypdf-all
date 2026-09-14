import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";

export const noidResponseStepWorkflow: StepWorkflowDefinition = {
  id: "noid-response",
  title: "NOID Response",
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

/** Intake fields collected in the "Case intake" step — shape of steps.intake.data. */
export type NoidResponseIntake = {
  formType?: string;
  receiptNumber?: string;
  applicantName?: string;
  noidIssuedDate?: string;
  responseDeadline?: string;
  deniedGroundsSummary?: string;
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail on every screen —
 * derived from the intake step's data, not tied to whichever step is
 * currently open (same pattern as Contractor Dispute's readiness list).
 */
export function getNoidResponseReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  return [
    { id: "form", label: "Form type and receipt number", done: Boolean(intake.formType && intake.receiptNumber) },
    { id: "applicant", label: "Applicant information", done: Boolean(intake.applicantName) },
    { id: "dates", label: "NOID and deadline dates", done: Boolean(intake.noidIssuedDate && intake.responseDeadline) },
    { id: "grounds", label: "Denial grounds summary", done: Boolean(intake.deniedGroundsSummary) },
    { id: "outcome", label: "Requested outcome", done: Boolean(intake.requestedOutcome) },
  ];
}

/** The "Estimated mailing package" summary is the same across every screen. */
export const noidResponseMailingPackage = [
  { label: "NOID response letter" },
  { label: "Evidence summary" },
  { label: "Supporting exhibits" },
  { label: "Proof of delivery (certified mail)" },
];
