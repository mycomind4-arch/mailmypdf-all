import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import type {
  WorkflowRuntimePolicy,
  WorkflowRuntimeStoredEvent,
} from "../../matter-runtime-server.js";
import { recordRecordsResponse } from "./tracking.js";
import { defineWorkflowRuntimeChatContract } from "../../workflow-chat-contract.js";

export const RECORDS_REQUEST_VERTICAL_ID = "records-request";

export const RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS = [
  "agency-records-request",
  "public-records-request",
  "open-records-request",
  "government-documents-request",
  "public-information-request",
] as const;

export type RecordsRequestRuntimeWorkflowId =
  (typeof RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS)[number];

function text(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${label} is required`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} is required`);
  if (normalized.length > max) throw new Error(`${label} is too long`);
  return normalized;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new Error(`${label} must be true or false`);
  return value;
}

function inputValue(
  input: Record<string, unknown>,
  manifestId: string,
  legacyId?: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(input, manifestId)) return input[manifestId];
  return legacyId ? input[legacyId] : undefined;
}

function storedText(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasAuthorityClaim(input: Record<string, unknown>): boolean {
  return [
    inputValue(input, "authority-name", "authorityName"),
    inputValue(input, "authority-citation", "authorityCitation"),
    inputValue(input, "response-timing-description", "responseTimingDescription"),
    inputValue(input, "withholding-instruction", "withholdingInstruction"),
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function assertIncludedDocumentsClean(documents: readonly WorkflowMatterDocument[]): void {
  const blocked = documents.filter(
    (document) =>
      document.role === "evidence" &&
      document.included &&
      (!document.usable || document.securityStatus !== "clean"),
  );
  if (blocked.length) {
    throw new Error("Every included Records Request context document must clear security scanning before drafting or packet assembly.");
  }
  const source = documents.find((document) => document.role === "subject_notice");
  if (source && (!source.usable || source.securityStatus !== "clean")) {
    throw new Error("An attached request-context source document must clear security scanning before downstream use.");
  }
}

export function createRecordsRequestRuntimePolicy(
  workflowId: RecordsRequestRuntimeWorkflowId,
): WorkflowRuntimePolicy {
  return {
    chatContract: defineWorkflowRuntimeChatContract({
      sourceDocument: "optional",
      inputFields: [
        { id: "requester-name", required: true },
        { id: "requester-address", required: true },
        { id: "requester-email", required: false },
        { id: "requester-phone", required: false },
        { id: "agency", required: true },
        { id: "custodian", required: false },
        { id: "agency-address", required: true },
        { id: "records-sought", required: true },
        { id: "date-range", required: false },
        { id: "case-reference", required: false },
        { id: "property-reference", required: false },
        { id: "preferred-format", required: false },
        { id: "fee-limit", required: false },
        { id: "fee-waiver-basis", required: false },
        { id: "additional-instructions", required: false },
        { id: "scope-confirmed", required: true },
        { id: "context-reviewed", required: true },
        { id: "jurisdiction", required: false },
        { id: "authority-name", required: false },
        { id: "authority-citation", required: false },
        { id: "response-timing-description", required: false },
        { id: "withholding-instruction", required: false },
        { id: "authority-verified", required: false },
        { id: "authority-reviewed", required: true },
      ],
      connectorFields: [
        {
          id: "agency-address",
          required: true,
          toolName: "preview_packet",
          argumentName: "recipient",
        },
      ],
      enforcedGateIds: [
        "scope-confirmed",
        "authority-grounding",
        "exact-packet-review",
        "mailing-authorization",
      ],
    }),
    requiresSourceDocument: false,

    validateMatter(input) {
      if (
        input.workflowId !== workflowId ||
        input.verticalId !== RECORDS_REQUEST_VERTICAL_ID
      ) {
        throw new Error("Records Request runtime identity does not match this workflow.");
      }
    },

    createAnalysisFromInput({ caseInput }) {
      const input = caseInput.input;
      const agency = storedText(input, "agency");
      const custodian = storedText(input, "custodian");
      const caseReference = storedText(input, "caseReference");
      const propertyReference = storedText(input, "propertyReference");
      const dateRange = storedText(input, "dateRange");
      const recordsSought = storedText(input, "recordsSought");

      if (!agency || !recordsSought) {
        throw new Error("Confirmed agency and records scope are required before request-first analysis can be created.");
      }

      return {
        decision: null,
        issuer: agency,
        referenceNumber: caseReference || null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: `Records request to ${agency} for the user-confirmed records scope.`,
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
        workflowDetails: {
          agency,
          custodian: custodian || null,
          caseReference: caseReference || null,
          propertyReference: propertyReference || null,
          dateRange: dateRange || null,
          recordCategories: [],
          contactDetails: [],
        },
      };
    },

    validateAnalysis(analysis: WorkflowMatterAnalysis) {
      if (!analysis.result.summary.trim()) {
        throw new Error("Records Request analysis must contain a summary.");
      }
    },

    validateInput(input) {
      const normalized = {
        requesterName: text(inputValue(input, "requester-name", "requesterName"), "Requester name", 200, true),
        requesterAddress: text(inputValue(input, "requester-address", "requesterAddress"), "Requester mailing address", 1000, true),
        requesterEmail: text(inputValue(input, "requester-email", "requesterEmail"), "Requester email", 320),
        requesterPhone: text(inputValue(input, "requester-phone", "requesterPhone"), "Requester phone", 60),
        agency: text(input.agency, "Agency or public body", 300, true),
        custodian: text(input.custodian, "Records custodian or department", 300),
        agencyAddress: text(inputValue(input, "agency-address", "agencyAddress"), "Agency mailing address", 1000, true),
        recordsSought: text(inputValue(input, "records-sought", "recordsSought"), "Records sought", 16000, true),
        dateRange: text(inputValue(input, "date-range", "dateRange"), "Relevant date range", 500),
        caseReference: text(inputValue(input, "case-reference", "caseReference"), "Case or matter reference", 200),
        propertyReference: text(inputValue(input, "property-reference", "propertyReference"), "Property or subject reference", 1000),
        preferredFormat: text(inputValue(input, "preferred-format", "preferredFormat"), "Preferred production format", 300),
        feeLimit: text(inputValue(input, "fee-limit", "feeLimit"), "Fee limit", 128),
        feeWaiverBasis: text(inputValue(input, "fee-waiver-basis", "feeWaiverBasis"), "Fee waiver basis", 4000),
        jurisdiction: text(input.jurisdiction, "Jurisdiction", 300),
        authorityName: text(inputValue(input, "authority-name", "authorityName"), "Authority name", 500),
        authorityCitation: text(inputValue(input, "authority-citation", "authorityCitation"), "Authority citation", 500),
        responseTimingDescription: text(inputValue(input, "response-timing-description", "responseTimingDescription"), "Response timing description", 3000),
        withholdingInstruction: text(inputValue(input, "withholding-instruction", "withholdingInstruction"), "Withholding instruction", 3000),
        authorityVerified: optionalBoolean(inputValue(input, "authority-verified", "authorityVerified"), "Authority verified") ?? false,
        scopeConfirmed: optionalBoolean(inputValue(input, "scope-confirmed", "scopeConfirmed"), "Scope confirmed") ?? false,
        contextReviewed: optionalBoolean(inputValue(input, "context-reviewed", "contextReviewed"), "Context reviewed") ?? false,
        authorityReviewed: optionalBoolean(inputValue(input, "authority-reviewed", "authorityReviewed"), "Authority reviewed") ?? false,
        additionalInstructions: text(inputValue(input, "additional-instructions", "additionalInstructions"), "Additional instructions", 6000),
      };

      if (!normalized.scopeConfirmed) {
        throw new Error("Confirm the agency, records scope, references, and material request facts before continuing.");
      }
      if (hasAuthorityClaim(input) && !normalized.authorityVerified) {
        throw new Error("Legal authority, citation, withholding, or timing language must be verified before it can be used in the request.");
      }
      return normalized;
    },

    validateDocumentsBeforeDraft(documents) {
      assertIncludedDocumentsClean(documents);
    },

    validateBeforeDraft({ caseInput }) {
      if (caseInput.input.contextReviewed !== true) {
        throw new Error("Complete the context review before drafting.");
      }
      if (caseInput.input.authorityReviewed !== true) {
        throw new Error("Complete the authority review before drafting.");
      }
    },

    validateDocumentsBeforePacket(documents) {
      assertIncludedDocumentsClean(documents);
    },

    validateBeforePacket({ caseInput }) {
      if (caseInput.input.contextReviewed !== true) {
        throw new Error("Complete the context review before packet assembly.");
      }
      if (caseInput.input.authorityReviewed !== true) {
        throw new Error("Complete the authority review before packet assembly.");
      }
    },

    validateUserEvent({ event, existingEvents }: {
      event: Record<string, unknown>;
      existingEvents: readonly WorkflowRuntimeStoredEvent[];
    }) {
      const sent = existingEvents.find(
        (candidate) =>
          candidate.type === "records_request_sent" &&
          candidate.source !== "user",
      );
      if (!sent) {
        throw new Error(
          "A trusted provider/system actual-send event is required before a records response can be recorded.",
        );
      }

      const responded = event.responded;
      if (typeof responded !== "boolean") {
        throw new Error("Response event must state whether the agency responded.");
      }

      const result = recordRecordsResponse({
        responded,
        responseDate:
          typeof event.responseDate === "string" ? event.responseDate : undefined,
        responseArtifactIds:
          Array.isArray(event.responseArtifactIds) &&
          event.responseArtifactIds.every((value) => typeof value === "string")
            ? event.responseArtifactIds
            : undefined,
        note: typeof event.note === "string" ? event.note : undefined,
        observationDate:
          typeof event.observationDate === "string" ? event.observationDate : undefined,
      });
      if (!result.ok || !result.event) {
        throw new Error(result.error ?? "Records response event is invalid.");
      }
      return result.event;
    },
  };
}

const policies = new Map<string, WorkflowRuntimePolicy>(
  RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS.map((workflowId) => [
    workflowId,
    createRecordsRequestRuntimePolicy(workflowId),
  ]),
);

export function getRecordsRequestRuntimePolicy(
  workflowId: string,
): WorkflowRuntimePolicy | null {
  return policies.get(workflowId) ?? null;
}
