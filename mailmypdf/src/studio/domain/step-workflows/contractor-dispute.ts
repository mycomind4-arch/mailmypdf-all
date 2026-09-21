import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";

export const contractorDisputeStepWorkflow: StepWorkflowDefinition = {
  id: "contractor-dispute",
  title: "Contractor Dispute",
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

/** Intake fields collected in the "Matter intake" step — shape of steps.intake.data. */
export type ContractorDisputeIntake = {
  propertyAddress?: string;
  contractorName?: string;
  agreementType?: string;
  dateAgreementSigned?: string;
  disputeSummary?: string;
  requestedResolution?: string;
  dateWorkBegan?: string;
  dateIssueDiscovered?: string;
};

/**
 * The "Readiness checklist" shown in the right rail is the same core-matter
 * completeness check on every screen (Property information, Contractor
 * information, Agreement details, Dispute summary, Requested resolution, Key
 * dates) — derived from the intake step's data, not tied to whichever step is
 * currently open.
 */
export function getContractorDisputeReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
  return [
    { id: "property", label: "Property information", done: Boolean(intake.propertyAddress) },
    { id: "contractor", label: "Contractor information", done: Boolean(intake.contractorName) },
    {
      id: "agreement",
      label: "Agreement details",
      done: Boolean(intake.agreementType && intake.dateAgreementSigned),
    },
    { id: "dispute", label: "Dispute summary", done: Boolean(intake.disputeSummary) },
    { id: "resolution", label: "Requested resolution", done: Boolean(intake.requestedResolution) },
    {
      id: "dates",
      label: "Key dates",
      done: Boolean(intake.dateWorkBegan && intake.dateIssueDiscovered),
    },
  ];
}

/** The "Estimated mailing package" summary is the same across every screen. */
export const contractorDisputeMailingPackage = [
  { label: "Demand letter (1–2 pages)" },
  { label: "Evidence summary" },
  { label: "Document exhibits" },
  { label: "Proof of delivery (certified mail)" },
];
