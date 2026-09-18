import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import type {
  WorkflowRuntimePolicy,
  WorkflowRuntimeStoredEvent,
} from "../../matter-runtime-server.js";
import { recordRecordsResponse } from "./tracking.js";

export const RECORDS_REQUEST_VERTICAL_ID = "records-request";

export const RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS = [
  "agency-records-request",
  "public-records-request",
  "open-records-request",
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

function storedText(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasAuthorityClaim(input: Record<string, unknown>): boolean {
  return [
    input.authorityName,
    input.authorityCitation,
    input.responseTimingDescription,
    input.withholdingInstruction,
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
        requesterName: text(input.requesterName, "Requester name", 200, true),
        requesterAddress: text(input.requesterAddress, "Requester mailing address", 1000, true),
        requesterEmail: text(input.requesterEmail, "Requester email", 320),
        requesterPhone: text(input.requesterPhone, "Requester phone", 60),
        agency: text(input.agency, "Agency or public body", 300, true),
        custodian: text(input.custodian, "Records custodian or department", 300),
        agencyAddress: text(input.agencyAddress, "Agency mailing address", 1000, true),
        recordsSought: text(input.recordsSought, "Records sought", 16000, true),
        dateRange: text(input.dateRange, "Relevant date range", 500),
        caseReference: text(input.caseReference, "Case or matter reference", 200),
        propertyReference: text(input.propertyReference, "Property or subject reference", 1000),
        preferredFormat: text(input.preferredFormat, "Preferred production format", 300),
        feeLimit: text(input.feeLimit, "Fee limit", 128),
        feeWaiverBasis: text(input.feeWaiverBasis, "Fee waiver basis", 4000),
        jurisdiction: text(input.jurisdiction, "Jurisdiction", 300),
        authorityName: text(input.authorityName, "Authority name", 500),
        authorityCitation: text(input.authorityCitation, "Authority citation", 500),
        responseTimingDescription: text(input.responseTimingDescription, "Response timing description", 3000),
        withholdingInstruction: text(input.withholdingInstruction, "Withholding instruction", 3000),
        authorityVerified: optionalBoolean(input.authorityVerified, "Authority verified") ?? false,
        scopeConfirmed: optionalBoolean(input.scopeConfirmed, "Scope confirmed") ?? false,
        contextReviewed: optionalBoolean(input.contextReviewed, "Context reviewed") ?? false,
        authorityReviewed: optionalBoolean(input.authorityReviewed, "Authority reviewed") ?? false,
        additionalInstructions: text(input.additionalInstructions, "Additional instructions", 6000),
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
