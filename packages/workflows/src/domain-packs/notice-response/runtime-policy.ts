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
import { defineWorkflowRuntimeChatContract } from "../../workflow-chat-contract.js";
import {
  NOTICE_RESPONSE_WORKFLOW_PROFILES,
  getNoticeResponseWorkflowProfile,
} from "./profiles.js";

export interface NoticeResponseRuntimeInput extends Record<string, unknown> {
  taxpayerName: string;
  taxpayerAddress: string;
  phone: string;
  noticeNumber: string;
  taxPeriod: string;
  responseMode: string;
  responseExplanation: string;
  requestedAction: string;
  additionalFacts: string;
  evidenceReviewComplete: boolean;
  factsConfirmed: boolean;
  mailingAppropriateConfirmed: boolean;
  evidenceReviewFingerprint: string;
}

function text(
  value: unknown,
  label: string,
  options: { required?: boolean; maxLength?: number } = {},
): string {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new WorkflowRuntimeError(
        `${label} is required.`,
        "NOTICE_INPUT_REQUIRED",
      );
    }
    return "";
  }
  if (typeof value !== "string") {
    throw new WorkflowRuntimeError(
      `${label} must be text.`,
      "NOTICE_INPUT_INVALID",
    );
  }
  const normalized = value.trim();
  if (options.required && !normalized) {
    throw new WorkflowRuntimeError(
      `${label} is required.`,
      "NOTICE_INPUT_REQUIRED",
    );
  }
  if (normalized.length > (options.maxLength ?? 10_000)) {
    throw new WorkflowRuntimeError(
      `${label} is too long.`,
      "NOTICE_INPUT_TOO_LONG",
    );
  }
  return normalized;
}

function bool(value: unknown, label: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") {
    throw new WorkflowRuntimeError(
      `${label} must be true or false.`,
      "NOTICE_INPUT_INVALID",
    );
  }
  return value;
}

export function noticeResponseEvidenceReviewFingerprint(
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
    .sort(
      (left, right) =>
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
      "Complete the supporting-document review before drafting.",
      "NOTICE_EVIDENCE_REVIEW_REQUIRED",
    );
  }
  const current = noticeResponseEvidenceReviewFingerprint(matter.documents);
  if (caseInput.input.evidenceReviewFingerprint !== current) {
    throw new WorkflowRuntimeError(
      "Supporting documents changed after review. Review the current document set again.",
      "NOTICE_EVIDENCE_REVIEW_STALE",
    );
  }
}

function validateNoticeAnalysis(analysis: WorkflowMatterAnalysis): void {
  if (!analysis.documentId.trim()) {
    throw new WorkflowRuntimeError(
      "Notice analysis is not tied to a source document.",
      "NOTICE_ANALYSIS_SOURCE_MISSING",
    );
  }
  if (!analysis.model.trim()) {
    throw new WorkflowRuntimeError(
      "Notice analysis model identity is missing.",
      "NOTICE_ANALYSIS_MODEL_MISSING",
    );
  }
  if (!analysis.result.summary.trim()) {
    throw new WorkflowRuntimeError(
      "Notice analysis summary is empty.",
      "NOTICE_ANALYSIS_SUMMARY_MISSING",
    );
  }
  if (analysis.result.summary.length > 20_000) {
    throw new WorkflowRuntimeError(
      "Notice analysis summary is too large.",
      "NOTICE_ANALYSIS_INVALID",
    );
  }
}

export function createNoticeResponseRuntimePolicy(
  workflowId: string,
): WorkflowRuntimePolicy {
  const profile = getNoticeResponseWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown Notice Respond workflow profile: ${workflowId}`);
  }
  const allowedModes = new Set(profile.responseModes.map((mode) => mode.value));

  return Object.freeze({
    chatContract: defineWorkflowRuntimeChatContract({
      sourceDocument: "required",
      inputFields: [
        { id: "taxpayerName", required: true },
        { id: "taxpayerAddress", required: true },
        { id: "noticeNumber", required: false },
        { id: "evidenceReviewComplete", required: true },
        { id: "responseMode", required: true },
        { id: "responseExplanation", required: false },
        { id: "requestedAction", required: true },
        { id: "factsConfirmed", required: true },
        { id: "mailingAppropriateConfirmed", required: true },
      ],
      connectorFields: [
        {
          id: "recipientAddress",
          required: true,
          toolName: "preview_packet",
          argumentName: "recipient",
        },
      ],
      enforcedGateIds: [
        "review-approved",
        "payment-authorized",
        "mail-authorized",
      ],
    }),

    validateMatter(input: { workflowId: string; verticalId: string }) {
      if (
        input.workflowId !== workflowId ||
        input.verticalId !== "notice-respond"
      ) {
        throw new WorkflowRuntimeError(
          "Matter identity does not match the Notice Respond workflow.",
          "WORKFLOW_IDENTITY_MISMATCH",
        );
      }
    },

    validateAnalysis: validateNoticeAnalysis,

    validateInput(
      input: Record<string, unknown>,
      _analysis: WorkflowMatterAnalysis | null,
      matter: WorkflowMatterSnapshot,
    ) {
      const responseMode = text(input.responseMode, "Response mode", {
        required: true,
        maxLength: 100,
      });
      if (!allowedModes.has(responseMode)) {
        throw new WorkflowRuntimeError(
          "Response mode is not valid for this notice.",
          "NOTICE_RESPONSE_MODE_INVALID",
        );
      }

      const responseExplanation = text(
        input.responseExplanation,
        "Response explanation",
        {
          required: profile.explanationRequiredModes.includes(responseMode),
          maxLength: 12_000,
        },
      );

      const normalized: NoticeResponseRuntimeInput = {
        taxpayerName: text(input.taxpayerName, "Taxpayer name", {
          required: true,
          maxLength: 200,
        }),
        taxpayerAddress: text(input.taxpayerAddress, "Taxpayer mailing address", {
          required: true,
          maxLength: 1_000,
        }),
        phone: text(input.phone, "Phone", { maxLength: 100 }),
        noticeNumber: text(input.noticeNumber, "Notice/reference number", {
          maxLength: 200,
        }),
        taxPeriod: text(input.taxPeriod, "Tax period", { maxLength: 100 }),
        responseMode,
        responseExplanation,
        requestedAction: text(input.requestedAction, "Requested action", {
          required: true,
          maxLength: 4_000,
        }),
        additionalFacts: text(input.additionalFacts, "Additional facts", {
          maxLength: 12_000,
        }),
        evidenceReviewComplete: bool(
          input.evidenceReviewComplete,
          "Evidence review complete",
        ),
        factsConfirmed: bool(input.factsConfirmed, "Facts confirmed"),
        mailingAppropriateConfirmed: bool(
          input.mailingAppropriateConfirmed,
          "Mailing appropriate confirmed",
        ),
        evidenceReviewFingerprint: "",
      };

      return {
        ...normalized,
        evidenceReviewFingerprint: normalized.evidenceReviewComplete
          ? noticeResponseEvidenceReviewFingerprint(matter.documents)
          : "",
      };
    },

    validateDocumentsBeforeDraft(
      documents: readonly WorkflowMatterDocument[],
      analysis: WorkflowMatterAnalysis,
    ) {
      assertStoredAnalysisReadyForDraft(analysis, documents);
    },

    validateBeforeDraft({ matter, caseInput }: {
      matter: WorkflowMatterSnapshot;
      caseInput: WorkflowRuntimeStoredInput;
      analysis: WorkflowMatterAnalysis;
    }) {
      assertEvidenceReviewCurrent(matter, caseInput);
      if (caseInput.input.factsConfirmed !== true) {
        throw new WorkflowRuntimeError(
          "Confirm the material notice facts before drafting.",
          "NOTICE_FACT_CONFIRMATION_REQUIRED",
        );
      }
    },

    validateDocumentsBeforePacket(
      documents: readonly WorkflowMatterDocument[],
      analysis: WorkflowMatterAnalysis,
    ) {
      assertStoredAnalysisReadyForDraft(analysis, documents);
    },

    validateBeforePacket({ matter, caseInput }: {
      matter: WorkflowMatterSnapshot;
      caseInput: WorkflowRuntimeStoredInput;
      analysis: WorkflowMatterAnalysis;
    }) {
      assertEvidenceReviewCurrent(matter, caseInput);
      if (caseInput.input.factsConfirmed !== true) {
        throw new WorkflowRuntimeError(
          "Confirm the material notice facts before packet assembly.",
          "NOTICE_FACT_CONFIRMATION_REQUIRED",
        );
      }
      if (caseInput.input.mailingAppropriateConfirmed !== true) {
        throw new WorkflowRuntimeError(
          "Confirm that written correspondence and the mailing destination are appropriate before packet assembly.",
          "NOTICE_MAILING_CONFIRMATION_REQUIRED",
        );
      }
    },
  });
}

export const NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS = Object.freeze(
  NOTICE_RESPONSE_WORKFLOW_PROFILES.map((profile) => profile.workflowId),
);

const policies = new Map<string, WorkflowRuntimePolicy>(
  NOTICE_RESPONSE_RUNTIME_WORKFLOW_IDS.map((workflowId) => [
    workflowId,
    createNoticeResponseRuntimePolicy(workflowId),
  ]),
);

export function getNoticeResponseRuntimePolicy(
  workflowId: string,
): WorkflowRuntimePolicy | null {
  return policies.get(workflowId) ?? null;
}
