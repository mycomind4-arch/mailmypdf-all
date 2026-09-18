import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  type EligibilityEvidence,
  type EligibilityEvidenceStatus,
  type SecuredTransactionEligibilityGateId,
} from "./rules/eligibility";

const KNOWN_GATE_IDS = new Set<string>(SECURED_TRANSACTION_ELIGIBILITY_GATES);
const KNOWN_STATUSES = new Set<EligibilityEvidenceStatus>([
  "verified",
  "unverified",
  "contradicted",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSourceRefs(value: unknown, gateId: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Gate "${gateId}" sourceRefs must be an array of source reference ids.`);
  }
  const refs = value.map((ref, index) => {
    if (typeof ref !== "string" || !ref.trim()) {
      throw new Error(`Gate "${gateId}" sourceRefs[${index}] must be a non-empty string.`);
    }
    return ref.trim();
  });
  return refs;
}

function validateGateEvidence(
  gateId: SecuredTransactionEligibilityGateId,
  value: unknown,
): EligibilityEvidence {
  if (!isPlainObject(value)) {
    throw new Error(`Gate "${gateId}" evidence must be an object with a status field.`);
  }

  const { status, sourceRefs, note } = value;

  if (typeof status !== "string" || !KNOWN_STATUSES.has(status as EligibilityEvidenceStatus)) {
    throw new Error(
      `Gate "${gateId}" has an unsupported status. Expected one of: verified, unverified, contradicted.`,
    );
  }

  if (note !== undefined && typeof note !== "string") {
    throw new Error(`Gate "${gateId}" note must be text when provided.`);
  }

  return {
    status: status as EligibilityEvidenceStatus,
    sourceRefs: validateSourceRefs(sourceRefs, gateId),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
}

/**
 * Structural/runtime validation only. This never decides whether a gate is
 * legally satisfied -- that determination belongs solely to
 * evaluateSecuredTransactionEligibility. This function's job is to ensure
 * malformed or unexpected caller input cannot silently be treated as
 * verified evidence by the shared engine.
 */
export function validateSecuredTransactionEligibilityInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (!isPlainObject(input)) {
    throw new Error("Secured-Transaction Eligibility input must be an object.");
  }

  const unknownKeys = Object.keys(input).filter((key) => !KNOWN_GATE_IDS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Secured-Transaction Eligibility input contains unrecognized field(s): ${unknownKeys.join(", ")}.`,
    );
  }

  const validated: Record<string, unknown> = {};
  for (const gateId of SECURED_TRANSACTION_ELIGIBILITY_GATES) {
    const value = input[gateId];
    if (value === undefined) continue;
    validated[gateId] = validateGateEvidence(gateId, value);
  }

  return validated;
}

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "secured-transaction-eligibility" || input.verticalId !== "secured-transactions") {
      throw new Error("Secured-Transaction Eligibility runtime identity does not match this workflow.");
    }
  },

  /**
   * This workflow gates on structured fact evidence, not an uploaded source
   * document. It is a request-first workflow in the sense the shared runtime
   * contract describes.
   */
  requiresSourceDocument: false,

  validateInput(input) {
    return validateSecuredTransactionEligibilityInput(input);
  },
};

export default workflowRuntimePolicy;
