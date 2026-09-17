import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
  WorkflowMatterSnapshot,
} from "../../matter-runtime-client.js";
import type {
  WorkflowRuntimePolicy,
  WorkflowRuntimeStoredInput,
} from "../../matter-runtime-server.js";
import { WorkflowRuntimeError } from "../../matter-runtime.js";
import { assertStoredAnalysisReadyForDraft } from "../../runtime-safety.js";
import { insuranceAppealWorkflowSpecs } from "./insurance-workflows.js";

export const INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS = Object.freeze([
  "appeal-denied-claim",
  ...insuranceAppealWorkflowSpecs.map((workflow) => workflow.workflowId),
] as const);

export type InsuranceAppealRuntimeWorkflowId =
  (typeof INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS)[number];

export interface InsuranceAppealRuntimeInput extends Record<string, unknown> {
  claimantName: string;
  claimantAddress: string;
  phone: string;
  claimNumber: string;
  organizationName: string;
  reasonsForDisagreement: string;
  requestedOutcome: string;
  additionalFacts: string;
  evidenceReviewComplete: boolean;
  evidenceReviewFingerprint: string;
}

function text(
  value: unknown,
  label: string,
  options: { required?: boolean; maxLength?: number } = {},
): string {
  const required = options.required ?? false;
  if (value === null || value === undefined) {
    if (required) throw new WorkflowRuntimeError(`${label} is required.`, "APPEAL_INPUT_REQUIRED");
    return "";
  }
  if (typeof value !== "string") {
    throw new WorkflowRuntimeError(`${label} must be text.`, "APPEAL_INPUT_INVALID");
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw new WorkflowRuntimeError(`${label} is required.`, "APPEAL_INPUT_REQUIRED");
  }
  if (normalized.length > (options.maxLength ?? 10_000)) {
    throw new WorkflowRuntimeError(`${label} is too long.`, "APPEAL_INPUT_TOO_LONG");
  }
  return normalized;
}

function booleanValue(value: unknown, label: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") {
    throw new WorkflowRuntimeError(`${label} must be true or false.`, "APPEAL_INPUT_INVALID");
  }
  return value;
}

export function validateInsuranceAppealRuntimeInput(
  input: Record<string, unknown>,
): InsuranceAppealRuntimeInput {
  return {
    claimantName: text(input.claimantName, "Claimant name", { required: true, maxLength: 200 }),
    claimantAddress: text(input.claimantAddress, "Claimant mailing address", { required: true, maxLength: 1_000 }),
    phone: text(input.phone, "Phone", { maxLength: 100 }),
    claimNumber: text(input.claimNumber, "Claim or reference number", { maxLength: 200 }),
    organizationName: text(input.organizationName, "Organization name", { maxLength: 300 }),
    reasonsForDisagreement: text(input.reasonsForDisagreement, "Reasons for disagreement", { required: true, maxLength: 12_000 }),
    requestedOutcome: text(input.requestedOutcome, "Requested outcome", { required: true, maxLength: 4_000 }),
    additionalFacts: text(input.additionalFacts, "Additional facts", { maxLength: 12_000 }),
    evidenceReviewComplete: booleanValue(input.evidenceReviewComplete, "Evidence review complete"),
    // This value is server-authored below. Ignore any client-supplied fingerprint.
    evidenceReviewFingerprint: "",
  };
}

export function insuranceAppealEvidenceReviewFingerprint(
  documents: readonly WorkflowMatterDocument[],
): string {
  const source = documents.find((document) => document.role === "subject_notice");
  const evidence = documents
    .filter((document) => document.role === "evidence")
    .map((document) => ({
      documentId: document.documentId,
      evidenceKind: document.evidenceKind,
      included: document.included,
      position: document.position,
      securityStatus: document.securityStatus,
      usable: document.usable,
    }))
    .sort((left, right) =>
      left.position - right.position ||
      left.documentId.localeCompare(right.documentId),
    );

  return JSON.stringify({
    sourceDocumentId: source?.documentId ?? null,
    evidence,
  });
}

function assertEvidenceReviewCurrent(
  matter: WorkflowMatterSnapshot,
  caseInput: WorkflowRuntimeStoredInput,
): void {
  if (caseInput.input.evidenceReviewComplete !== true) {
    throw new WorkflowRuntimeError(
      "Complete the supporting-evidence review before drafting.",
      "EVIDENCE_REVIEW_REQUIRED",
    );
  }

  const storedFingerprint = caseInput.input.evidenceReviewFingerprint;
  const currentFingerprint = insuranceAppealEvidenceReviewFingerprint(matter.documents);
  if (typeof storedFingerprint !== "string" || storedFingerprint !== currentFingerprint) {
    throw new WorkflowRuntimeError(
      "Supporting evidence changed after review. Review the current evidence set again.",
      "EVIDENCE_REVIEW_STALE",
    );
  }
}

function validateInsuranceAnalysis(analysis: WorkflowMatterAnalysis): void {
  if (!analysis.documentId.trim()) {
    throw new WorkflowRuntimeError("Analysis is not tied to a source document.", "ANALYSIS_SOURCE_MISSING");
  }
  if (!analysis.model.trim()) {
    throw new WorkflowRuntimeError("Analysis model identity is missing.", "ANALYSIS_MODEL_MISSING");
  }
  if (!analysis.result.summary.trim()) {
    throw new WorkflowRuntimeError("Analysis summary is empty.", "ANALYSIS_SUMMARY_MISSING");
  }
  if (analysis.result.summary.length > 20_000) {
    throw new WorkflowRuntimeError("Analysis summary is too large.", "ANALYSIS_SUMMARY_INVALID");
  }
  for (const [label, values] of [
    ["reasons", analysis.result.reasons],
    ["missing information", analysis.result.missingInformation],
    ["suggested evidence", analysis.result.suggestedEvidence],
  ] as const) {
    if (values.length > 100 || values.some((value) => typeof value !== "string" || value.length > 4_000)) {
      throw new WorkflowRuntimeError(`Analysis ${label} is invalid.`, "ANALYSIS_LIST_INVALID");
    }
  }
}

function isInsuranceAppealRuntimeWorkflowId(
  workflowId: string,
): workflowId is InsuranceAppealRuntimeWorkflowId {
  return (INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS as readonly string[]).includes(workflowId);
}

export function createInsuranceAppealRuntimePolicy(
  workflowId: InsuranceAppealRuntimeWorkflowId,
): WorkflowRuntimePolicy {
  const policy: WorkflowRuntimePolicy = {
    validateMatter(input) {
      if (input.workflowId !== workflowId || input.verticalId !== "appeal-mail") {
        throw new WorkflowRuntimeError(
          "Matter identity does not match the insurance appeal workflow.",
          "WORKFLOW_IDENTITY_MISMATCH",
        );
      }
    },
    validateAnalysis: validateInsuranceAnalysis,
    validateInput(input, _analysis, matter) {
      const normalized = validateInsuranceAppealRuntimeInput(input);
      return {
        ...normalized,
        evidenceReviewFingerprint: normalized.evidenceReviewComplete
          ? insuranceAppealEvidenceReviewFingerprint(matter.documents)
          : "",
      };
    },
    validateDocumentsBeforeDraft(documents, analysis) {
      assertStoredAnalysisReadyForDraft(analysis, documents);
    },
    validateBeforeDraft({ matter, caseInput }) {
      assertEvidenceReviewCurrent(matter, caseInput);
    },
    validateDocumentsBeforePacket(documents, analysis) {
      assertStoredAnalysisReadyForDraft(analysis, documents);
    },
    validateBeforePacket({ matter, caseInput }) {
      assertEvidenceReviewCurrent(matter, caseInput);
    },
  };

  return Object.freeze(policy);
}

const INSURANCE_APPEAL_RUNTIME_POLICIES = new Map<
  InsuranceAppealRuntimeWorkflowId,
  WorkflowRuntimePolicy
>(
  INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS.map((workflowId) => [
    workflowId,
    createInsuranceAppealRuntimePolicy(workflowId),
  ]),
);

/**
 * Host-facing lookup for the new shared matter runtime. Hosts can compose this
 * with other vertical policy registries without importing any legacy app code.
 */
export function getInsuranceAppealRuntimePolicy(
  workflowId: string,
): WorkflowRuntimePolicy | null {
  if (!isInsuranceAppealRuntimeWorkflowId(workflowId)) return null;
  return INSURANCE_APPEAL_RUNTIME_POLICIES.get(workflowId) ?? null;
}
