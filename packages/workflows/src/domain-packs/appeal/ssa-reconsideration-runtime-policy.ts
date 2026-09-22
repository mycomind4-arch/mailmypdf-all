import type {
  WorkflowMatterAnalysis,
  WorkflowMatterDocument,
} from "../../matter-runtime-client.js";
import type { WorkflowRuntimePolicy } from "../../matter-runtime-server.js";

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

function assertReconsiderationAnalysis(
  program: SsaReconsiderationProgram,
  analysis: WorkflowMatterAnalysis,
): Exclude<SsaDecisionBasis, "unknown"> {
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

  for (const kind of required) {
    const found = documents.find(
      (document) =>
        document.role === "evidence" &&
        document.evidenceKind === kind &&
        document.included &&
        document.usable &&
        document.securityStatus === "clean",
    );
    if (!found) {
      const label = SSA_RECONSIDERATION_FORMS.find((form) => form.kind === kind)?.label ?? kind;
      throw new Error(`${label} must be completed, uploaded, included, and clear security scanning.`);
    }
  }
}

export function createSsaReconsiderationRuntimePolicy(
  workflowId: SsaReconsiderationWorkflowId,
): WorkflowRuntimePolicy {
  const program = SSA_RECONSIDERATION_WORKFLOWS[workflowId];

  return Object.freeze({
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

    validateInput(input, analysis) {
      if (!analysis) throw new Error(`Analyze the ${program} denial before saving claimant facts.`);
      const basis = assertReconsiderationAnalysis(program, analysis);
      if (input.responseMode !== "reconsideration" || input.confirmedReconsideration !== true) {
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
      const blockedIncluded = documents.filter(
        (document) => document.role === "evidence" && document.included && (!document.usable || document.securityStatus !== "clean"),
      );
      if (blockedIncluded.length) {
        throw new Error(`Every included ${program} evidence document must clear security scanning before drafting.`);
      }
    },

    validateDocumentsBeforePacket(documents, analysis) {
      const basis = assertReconsiderationAnalysis(program, analysis);
      assertRequiredForms(documents, basis);
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
