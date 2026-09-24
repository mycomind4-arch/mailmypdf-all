import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";

export const IMMIGRATION_COVER_LETTER_WORKFLOW_ID =
  "immigration-filing-cover-letter";

export const IMMIGRATION_COVER_LETTER_VERTICAL_ID = "immigration-mail";

export const IMMIGRATION_COVER_LETTER_STEPS = [
  { id: "filing", label: "Filing document" },
  { id: "analysis", label: "Filing details" },
  { id: "facts", label: "Confirm details" },
  { id: "documents", label: "Packet documents" },
  { id: "draft", label: "Cover letter" },
  { id: "review", label: "Review" },
  { id: "mail", label: "Pay & mail" },
] as const;

/**
 * Canonical StepWorkflow definition for Immigration Filing Cover Letter.
 *
 * The existing runtime-backed start UI can continue consuming the exported
 * constants below while the workflow itself now participates in the common
 * StepWorkflow architecture.
 */
export const immigrationFilingCoverLetterStepWorkflow: StepWorkflowDefinition = {
  id: IMMIGRATION_COVER_LETTER_WORKFLOW_ID,
  title: "Immigration Filing Cover Letter",
  steps: [...IMMIGRATION_COVER_LETTER_STEPS],
  requiresApprovalBeforeStep: "mail",
};

export type ImmigrationCoverLetterStepId =
  (typeof IMMIGRATION_COVER_LETTER_STEPS)[number]["id"];

export const IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS = [
  ["filing_form", "Filing form or application"],
  ["supporting_evidence", "Supporting evidence"],
  ["identity_document", "Identity document"],
  ["prior_notice", "Prior USCIS notice"],
  ["receipt_notice", "Receipt notice"],
  ["payment_evidence", "Fee or payment evidence"],
  ["other", "Other packet document"],
] as const;

export type ImmigrationCoverLetterDocumentKind =
  (typeof IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS)[number][0];

/**
 * Compatibility projection for the current runtime-backed UI.
 *
 * This will disappear once start/index.tsx is driven directly by
 * StepMatterState through the StepWorkflow matter-client harness.
 */
export function immigrationCoverLetterCompletedSteps(input: {
  hasCleanPrimary: boolean;
  hasAnalysis: boolean;
  hasFacts: boolean;
  hasDraft: boolean;
  hasApproval: boolean;
}): ImmigrationCoverLetterStepId[] {
  const completed: ImmigrationCoverLetterStepId[] = [];

  if (input.hasCleanPrimary) completed.push("filing");
  if (input.hasAnalysis) completed.push("analysis");

  if (input.hasFacts) {
    completed.push("facts");
    completed.push("documents");
  }

  if (input.hasDraft) completed.push("draft");
  if (input.hasApproval) completed.push("review");

  return completed;
}
