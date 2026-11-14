import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import type { WorkflowRuntimePolicy } from "../../matter-runtime-server.js";
import { defineWorkflowRuntimeChatContract } from "../../workflow-chat-contract.js";

/**
 * Runtime policy for SSA reconsideration requests (SSDI and SSI denials).
 *
 * Both programs share the same appeal level, decision-basis classification
 * and official-form requirement; they differ only in which claimant facts are
 * collected. The appeal level and basis must come from the analysed notice,
 * never from the workflow name.
 */

export type SsaAppealStage = "reconsideration" | "hearing" | "appeals_council" | "unknown";
export type SsaDecisionBasis = "medical" | "nonmedical" | "unknown";
export type SsaReconsiderationProgram = "SSDI" | "SSI";

export const SSA_RECONSIDERATION_FORMS = Object.freeze([
  { kind: "ssa_561", label: "SSA-561-U2 — Request for Reconsideration" },
  { kind: "ssa_3441", label: "SSA-3441 — Disability Report — Appeal" },
  { kind: "ssa_827", label: "SSA-827 — Authorization to Disclose Information" },
] as const);

export type SsaReconsiderationFormKind = (typeof SSA_RECONSIDERATION_FORMS)[number]["kind"];

export const SSA_RECONSIDERATION_WORKFLOWS = Object.freeze({
  "appeal-ssdi-denial": "SSDI",
  "appeal-ssi-denial": "SSI",
} as const satisfies Record<string, SsaReconsiderationProgram>);

export type SsaReconsiderationWorkflowId = keyof typeof SSA_RECONSIDERATION_WORKFLOWS;

const VERTICAL_ID = "appeal-mail";

export function requiredSsaReconsiderationFormKinds(
  basis: SsaDecisionBasis,
): readonly SsaReconsiderationFormKind[] {
  if (basis === "medical") return ["ssa_561", "ssa_3441", "ssa_827"];
  if (basis === "nonmedical") return ["ssa_561"];
  return [];
}

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

/**
 * Do not treat a denial from an unrelated agency as an SSA reconsideration.
 * The notice analyzer must identify the issuing agency; an unknown issuer
 * requires review instead of generating or mailing SSA forms.
 */
function isSsaIssuingAgency(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const issuer = value.trim().replace(/\s+/g, " ").replace(/\./g, "").toLowerCase();
  return /^(?:ssa|(?:us )?social security(?: administration)?(?: \(ssa\))?)$/.test(issuer);
}

function assertReconsiderationAnalysis(
  program: SsaReconsiderationProgram,
  analysis: WorkflowMatterAnalysis,
): Exclude<SsaDecisionBasis, "unknown"> {
  // A confirmed appeal level and decision basis do not, by themselves, prove
  // that the source notice denied benefits. Never construct a denial appeal
  // from an approval or an unclassified decision.
  // The analyzer may return "Denied" or "denied"; accept only that
  // decision after case/whitespace normalization, never an approval or
  // an unknown decision.
  if (!isSsaIssuingAgency(analysis.result.issuer)) {
    throw new Error(`The source ${program} notice must identify the Social Security Administration as the issuer.`);
  }
  if (typeof analysis.result.decision !== "string" || analysis.result.decision.trim().toLowerCase() !== "denied") {
    throw new Error(`The source ${program} notice must confirm a denial before reconsideration.`);
  }
  const stage = analysis.result.workflowDetails?.appealStage;
  if (stage !== "reconsideration") {
    throw new Error(
      stage === "unknown" || stage === undefined || stage === null
        ? `The ${program} appeal level is not confirmed from the source notice.`
        : `This workflow is for reconsideration, not ${String(stage).replaceAll("_", " ")}.`,
    );
  }
  const basis = analysis.result.workflowDetails?.decisionBasis;
  if (basis !== "medical" && basis !== "nonmedical") {
    throw new Error("The source notice does not confirm whether the reconsideration is medical or non-medical.");
  }
  return basis;
}

function assertRequiredForms(
  documents: readonly WorkflowMatterDocument[],
  basis: SsaDecisionBasis,
): void {
  const required = requiredSsaReconsiderationFormKinds(basis);
  if (!required.length) throw new Error("The required SSA form set cannot be chosen until the denial basis is confirmed.");

  // Each required form must be a distinct uploaded PDF. The matter attachment
  // API permits one owned document to be attached under multiple evidence kinds.
  const usedDocumentIds = new Map<string, SsaReconsiderationFormKind>();
  // An uploaded denial notice is evidence of the decision, not a completed
  // SSA-561/3441/827 form. The matter API can attach the same owned PDF under
  // multiple roles; reject that alias before constructing a mailing packet.
  const sourceDocumentIds = new Set(
    documents.filter((document) => document.role === "subject_notice").map((document) => document.documentId),
  );
  for (const kind of required) {
    const label = SSA_RECONSIDERATION_FORMS.find((form) => form.kind === kind)?.label ?? kind;
    const includedForms = documents.filter(
      (document) =>
        document.role === "evidence" &&
        document.evidenceKind === kind &&
        document.included,
    );
    // The mailing packet must contain exactly one completed copy of each
    // required official form. Retained but excluded historical uploads do not
    // count; multiple included copies make the outgoing packet ambiguous.
    if (includedForms.length > 1) {
      throw new Error(`${label} has duplicate included attachments; keep exactly one for mailing.`);
    }
    const found = includedForms[0];
    if (!found || found.mimeType !== "application/pdf" || !found.usable || found.securityStatus !== "clean") {
      throw new Error(`${label} must be completed, uploaded, included, and clear security scanning.`);
    }
    if (sourceDocumentIds.has(found.documentId)) {
      throw new Error(`${label} reuses the analyzed denial notice PDF; upload the completed SSA form separately.`);
    }
    const priorKind = usedDocumentIds.get(found.documentId);
    if (priorKind && priorKind !== kind) {
      throw new Error(`${label} reuses the same uploaded PDF as ${priorKind}; upload distinct completed PDFs for required forms.`);
    }
    usedDocumentIds.set(found.documentId, kind);
  }

  // The matter API can attach the same owned PDF under different evidence
  // kinds. Checking only the required SSA forms misses an included copy
  // relabeled as supplemental evidence, which would mail the PDF twice.
  // Historical excluded uploads do not contribute to the outgoing packet.
  const includedEvidenceIds = new Set<string>();
  for (const document of documents) {
    if (document.role !== "evidence" || !document.included) continue;
    if (includedEvidenceIds.has(document.documentId)) {
      throw new Error("The same uploaded PDF appears in duplicate included SSA attachments; remove the extra selection.");
    }
    includedEvidenceIds.add(document.documentId);
  }
}

// TIFF is useful as a scanned *source* notice for analysis, but the shared
// physical-mail packet builder can only enclose PDF, PNG and JPEG bytes.
const SSA_SUPPORTED_SOURCE_MIME_TYPES = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/tiff",
]);
const SSA_SUPPORTED_PACKET_MIME_TYPES = new Set([
  "application/pdf", "image/png", "image/jpeg",
]);

function assertSupportedSourceNoticeFormat(document: WorkflowMatterDocument): void {
  // Source notices are analyzed rather than mailed, so they are commonly
  // included=false. Still enforce the manifest's upload format contract.
  if (!SSA_SUPPORTED_SOURCE_MIME_TYPES.has(document.mimeType ?? "")) {
    throw new Error("The source denial notice must be a supported PDF or image file.");
  }
}

function assertSupportedIncludedEvidenceFormats(
  documents: readonly WorkflowMatterDocument[],
  program: SsaReconsiderationProgram,
): void {
  // Source notices are excluded from outgoing mail by default, but must
  // still be valid inputs for analysis and reconsideration preparation.
  for (const document of documents) {
    if (document.role === "subject_notice") assertSupportedSourceNoticeFormat(document);
  }
  // The shared physical-mail packet builder only renders PDF, PNG and JPEG.
  // An analyzed TIFF notice may remain excluded, but including it (or a TIFF
  // supplemental upload) must not be reported as ready for mailed PDF assembly.
  if (documents.some((document) =>
    document.included &&
    !SSA_SUPPORTED_PACKET_MIME_TYPES.has(document.mimeType ?? "")
  )) {
    throw new Error(`Included ${program} documents must be a supported PDF or image (PNG or JPEG) file; convert TIFF to PDF, PNG or JPEG before mailing.`);
  }
}

function assertCurrentSourceAnalysis(
  documents: readonly WorkflowMatterDocument[],
  analysis: WorkflowMatterAnalysis,
): void {
  // The stored analysis is bound to the exact uploaded denial document. If a
  // claimant replaces the notice, a previously confirmed denial must not be
  // reused to draft, preview, approve, or pay for a different source.
  // The runtime attaches subject_notice with included=false by default:
  // source notices are analyzed, not mailed as outgoing evidence. Requiring
  // included=true here would block every normal SSDI/SSI intake from drafting.
  const sources = documents.filter((document) => document.role === "subject_notice");
  // Multiple source notices make the analysis-to-source binding ambiguous,
  // even if one document ID matches the saved analysis.
  const source = sources[0];
  if (sources.length !== 1 || !source || source.documentId !== analysis.documentId) {
    throw new Error("The source notice does not match the analyzed denial notice; analyze the current source notice again.");
  }
  assertSupportedSourceNoticeFormat(source);
  // Apply the same fail-closed security boundary to fact intake, draft, and
  // packet review. A previously analyzed notice may later be quarantined.
  if (!source.usable || source.securityStatus !== "clean") {
    throw new Error("The current denial notice must clear security scanning before continuing.");
  }
}

function chatInputFieldsForProgram(program: SsaReconsiderationProgram) {
  const shared = [
    { id: "claimantName", required: true },
    { id: "claimantAddress", required: true },
    { id: "phone", required: true },
    { id: "representativeName", required: false },
    { id: "confirmedReconsideration", required: true },
    { id: "reasonsForDisagreement", required: true },
    { id: "conditionChanges", required: false },
    { id: "newConditions", required: false },
    { id: "treatmentChanges", required: false },
    { id: "medicationChanges", required: false },
    { id: "dailyFunctionChanges", required: false },
  ];

  return [
    ...shared,
    ...(program === "SSDI"
      ? [{ id: "workChanges", required: false }]
      : [
          { id: "incomeFacts", required: false },
          { id: "resourceFacts", required: false },
          { id: "livingArrangementFacts", required: false },
          { id: "eligibilityFacts", required: false },
        ]),
    { id: "additionalFacts", required: false },
    { id: "requestedOutcome", required: false },
  ] as const;
}

export function createSsaReconsiderationRuntimePolicy(
  workflowId: SsaReconsiderationWorkflowId,
): WorkflowRuntimePolicy {
  const program = SSA_RECONSIDERATION_WORKFLOWS[workflowId];

  return Object.freeze({
    chatContract: defineWorkflowRuntimeChatContract({
      sourceDocument: "required",
      inputFields: chatInputFieldsForProgram(program),
      connectorFields: [
        {
          id: "recipientAddress",
          required: true,
          toolName: "preview_packet",
          argumentName: "recipient",
        },
      ],
      enforcedGateIds: [
        "source-document-ready",
        "facts-confirmed",
        "exact-packet-review",
        "mailing-authorization",
      ],
    }),
    validateMatter(input) {
      if (input.workflowId !== workflowId || input.verticalId !== VERTICAL_ID) {
        throw new Error(`${program} denial runtime identity does not match this workflow.`);
      }
    },

    // A notice containing suspicious text is not rejected for that alone: the
    // AI boundary treats document content as data and records the observation.
    validateAnalysis(analysis) {
      assertReconsiderationAnalysis(program, analysis);
    },

    validateInput(input, analysis, matter) {
      if (!analysis) throw new Error(`Analyze the ${program} denial before saving claimant facts.`);
      // A replaced denial notice invalidates the prior analysis even before
      // draft generation. Do not persist facts under the wrong source decision.
      assertCurrentSourceAnalysis(matter.documents, analysis);
      const basis = assertReconsiderationAnalysis(program, analysis);
      if ((input.responseMode !== undefined && input.responseMode !== "reconsideration") || input.confirmedReconsideration !== true) {
        throw new Error("The claimant must explicitly confirm reconsideration before continuing.");
      }

      const common = {
        claimantName: text(input.claimantName, "Claimant name", 200, true),
        claimantAddress: text(input.claimantAddress, "Claimant address", 1000, true),
        phone: text(input.phone, "Phone", 60, true),
        representativeName: text(input.representativeName, "Representative name", 200),
        responseMode: "reconsideration",
        confirmedReconsideration: true,
        reasonsForDisagreement: text(input.reasonsForDisagreement, "Reasons for disagreement", 8000, true),
        conditionChanges: text(input.conditionChanges, "Condition changes", 8000),
        newConditions: text(input.newConditions, "New conditions", 8000),
        treatmentChanges: text(input.treatmentChanges, "Treatment changes", 8000),
        medicationChanges: text(input.medicationChanges, "Medication changes", 8000),
      };

      if (program === "SSDI") {
        return {
          ...common,
          workChanges: text(input.workChanges, "Work changes", 8000),
          dailyFunctionChanges: text(input.dailyFunctionChanges, "Daily-function changes", 8000),
          additionalFacts: text(input.additionalFacts, "Additional facts", 12000),
          requestedOutcome: text(input.requestedOutcome, "Requested outcome", 2000),
        };
      }

      const normalized = {
        ...common,
        dailyFunctionChanges: text(input.dailyFunctionChanges, "Daily-function changes", 8000),
        incomeFacts: text(input.incomeFacts, "Income facts", 8000),
        resourceFacts: text(input.resourceFacts, "Resource facts", 8000),
        livingArrangementFacts: text(input.livingArrangementFacts, "Living-arrangement facts", 8000),
        eligibilityFacts: text(input.eligibilityFacts, "Eligibility facts", 8000),
        additionalFacts: text(input.additionalFacts, "Additional facts", 12000),
        requestedOutcome: text(input.requestedOutcome, "Requested outcome", 2000),
      };
      if (basis === "nonmedical" && !(
        normalized.incomeFacts ||
        normalized.resourceFacts ||
        normalized.livingArrangementFacts ||
        normalized.eligibilityFacts ||
        normalized.additionalFacts
      )) {
        throw new Error("Add the SSI non-medical facts that explain why you disagree with the denial.");
      }
      return normalized;
    },

    validateDocumentsBeforeDraft(documents, analysis) {
      assertReconsiderationAnalysis(program, analysis);
      // The source denial notice is untrusted input too: fail closed for every
      // included document, not only those classified as supporting evidence.
      const blockedIncluded = documents.filter(
        (document) => document.included && (!document.usable || document.securityStatus !== "clean"),
      );
      if (blockedIncluded.length) {
        throw new Error(`Every included ${program} document must clear security scanning before drafting.`);
      }
      assertSupportedIncludedEvidenceFormats(documents, program);
    },

    validateDocumentsBeforePacket(documents, analysis) {
      const basis = assertReconsiderationAnalysis(program, analysis);
      // Preserve form-specific errors for required SSA-561/3441/827 uploads.
      assertRequiredForms(documents, basis);
      // Draft-time scanning is not sufficient: supplemental evidence can be
      // quarantined or revoked before preview, approval, or checkout. The
      // shared host enforces this too, but policy consumers must fail closed.
      const blockedIncluded = documents.filter(
        (document) => document.included && (!document.usable || document.securityStatus !== "clean"),
      );
      if (blockedIncluded.length) {
        throw new Error(`Every included ${program} document must clear security scanning before packet review.`);
      }
      assertSupportedIncludedEvidenceFormats(documents, program);
    },

    validateBeforeDraft({ matter, analysis }) {
      assertCurrentSourceAnalysis(matter.documents, analysis);
    },

    validateBeforePacket({ matter, analysis }) {
      assertCurrentSourceAnalysis(matter.documents, analysis);
    },
  } satisfies WorkflowRuntimePolicy);
}

function isSsaReconsiderationWorkflowId(workflowId: string): workflowId is SsaReconsiderationWorkflowId {
  return Object.hasOwn(SSA_RECONSIDERATION_WORKFLOWS, workflowId);
}

const SSA_RECONSIDERATION_POLICIES = new Map<string, WorkflowRuntimePolicy>(
  (Object.keys(SSA_RECONSIDERATION_WORKFLOWS) as SsaReconsiderationWorkflowId[]).map((workflowId) => [
    workflowId,
    createSsaReconsiderationRuntimePolicy(workflowId),
  ]),
);

export function getSsaReconsiderationRuntimePolicy(workflowId: string): WorkflowRuntimePolicy | null {
  if (!isSsaReconsiderationWorkflowId(workflowId)) return null;
  return SSA_RECONSIDERATION_POLICIES.get(workflowId) ?? null;
}
