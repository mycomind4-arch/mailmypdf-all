import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import type { WorkflowRuntimePolicy } from "../../matter-runtime-server.js";
import { WorkflowRuntimeError } from "../../matter-runtime.js";
import { assertStoredAnalysisReadyForDraft } from "../../runtime-safety.js";

/**
 * Runtime policy for an immigration filing cover letter.
 *
 * The cover letter accompanies a filing; it is not the filing. Drafting is
 * constrained to user-confirmed filing details, and a packet cannot be built
 * unless the filing itself travels in it.
 */

export const IMMIGRATION_COVER_LETTER_WORKFLOW_ID = "immigration-filing-cover-letter";
export const IMMIGRATION_MAIL_VERTICAL_ID = "immigration-mail";

function text(
  value: unknown,
  label: string,
  max: number,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new WorkflowRuntimeError(`${label} is required.`, "IMMIGRATION_INPUT_REQUIRED");
    return "";
  }
  if (typeof value !== "string") {
    throw new WorkflowRuntimeError(`${label} must be text.`, "IMMIGRATION_INPUT_INVALID");
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw new WorkflowRuntimeError(`${label} is required.`, "IMMIGRATION_INPUT_REQUIRED");
  }
  if (normalized.length > max) {
    throw new WorkflowRuntimeError(`${label} is too long.`, "IMMIGRATION_INPUT_TOO_LONG");
  }
  return normalized;
}

function validateCoverLetterAnalysis(analysis: WorkflowMatterAnalysis): void {
  if (!analysis.documentId.trim()) {
    throw new WorkflowRuntimeError("Analysis is not tied to the filing document.", "ANALYSIS_SOURCE_MISSING");
  }
  if (!analysis.result.summary.trim() || analysis.result.summary.length > 20_000) {
    throw new WorkflowRuntimeError("Analysis summary is missing or invalid.", "ANALYSIS_SUMMARY_INVALID");
  }
}

function isCleanIncluded(document: WorkflowMatterDocument): boolean {
  return document.included && document.usable && document.securityStatus === "clean";
}

function assertFilingEnclosed(documents: readonly WorkflowMatterDocument[]): void {
  const enclosed = documents.some(
    (document) =>
      isCleanIncluded(document) &&
      (document.role === "subject_notice" ||
        (document.role === "evidence" && document.evidenceKind === "filing_form")),
  );
  if (!enclosed) {
    throw new WorkflowRuntimeError(
      "Include the filing form or application in the packet: a cover letter must be mailed with the filing it accompanies.",
      "IMMIGRATION_FILING_NOT_ENCLOSED",
    );
  }
}

export const immigrationFilingCoverLetterRuntimePolicy: WorkflowRuntimePolicy = Object.freeze({
  validateMatter(input) {
    if (
      input.workflowId !== IMMIGRATION_COVER_LETTER_WORKFLOW_ID ||
      input.verticalId !== IMMIGRATION_MAIL_VERTICAL_ID
    ) {
      throw new WorkflowRuntimeError(
        "Matter identity does not match the immigration filing cover letter workflow.",
        "WORKFLOW_IDENTITY_MISMATCH",
      );
    }
  },

  validateAnalysis: validateCoverLetterAnalysis,

  validateInput(input, analysis) {
    if (!analysis) {
      throw new WorkflowRuntimeError(
        "Analyze the filing document before confirming filing details.",
        "ANALYSIS_REQUIRED",
      );
    }
    return {
      applicantName: text(input.applicantName, "Applicant or beneficiary name", 200, true),
      petitionerName: text(input.petitionerName, "Petitioner name", 200),
      filingType: text(input.filingType, "Filing type", 300, true),
      formNumbers: text(input.formNumbers, "Form number(s)", 300, true),
      receiptOrANumber: text(input.receiptOrANumber, "Receipt or A-number", 100),
      filingPurpose: text(input.filingPurpose, "Purpose of this filing", 4_000, true),
      specialInstructions: text(input.specialInstructions, "Special instructions", 4_000),
    };
  },

  validateDocumentsBeforeDraft(documents, analysis) {
    assertStoredAnalysisReadyForDraft(analysis, documents);
  },

  validateDocumentsBeforePacket(documents, analysis) {
    assertStoredAnalysisReadyForDraft(analysis, documents);
    assertFilingEnclosed(documents);
  },
} satisfies WorkflowRuntimePolicy);

export function getImmigrationRuntimePolicy(workflowId: string): WorkflowRuntimePolicy | null {
  return workflowId === IMMIGRATION_COVER_LETTER_WORKFLOW_ID
    ? immigrationFilingCoverLetterRuntimePolicy
    : null;
}
