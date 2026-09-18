import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  type EligibilityEvidence,
  type EligibilityEvidenceStatus,
  type SecuredTransactionEligibilityGateId,
  type SecuredTransactionEligibilityInput,
} from "./rules/eligibility";

const KNOWN_GATE_IDS = new Set<string>(SECURED_TRANSACTION_ELIGIBILITY_GATES);
const KNOWN_STATUSES = new Set<EligibilityEvidenceStatus>([
  "verified",
  "unverified",
  "contradicted",
]);

/**
 * Matches the "kind" field of the shared SecuredTransactionSourceRef model
 * (packages/secured-transactions/src/types.ts) so persisted evidence can
 * eventually be linked to a real SecuredTransactionSourceRef without a
 * shape change. This module does not import that type directly (the shared
 * engine's own EligibilityEvidence.sourceRefs stays a plain string[] and is
 * never changed here) -- it is duplicated deliberately as a literal union
 * so the workflow layer cannot silently drift from it.
 */
export type EligibilityEvidenceSourceKind =
  | "document"
  | "registry"
  | "filing"
  | "authority"
  | "user-confirmed";

const KNOWN_SOURCE_KINDS = new Set<EligibilityEvidenceSourceKind>([
  "document",
  "registry",
  "filing",
  "authority",
  "user-confirmed",
]);

/**
 * A single structured evidence source for one eligibility gate. Distinct
 * from the shared engine's plain sourceRefs: string[] -- this is what gets
 * persisted and displayed; toEngineGateEvidence() reduces it down to the
 * string[] shape the shared engine actually expects.
 */
export interface EligibilityGateSourceRef {
  readonly kind: EligibilityEvidenceSourceKind;
  readonly id: string;
  readonly label: string;
  readonly sourceUri?: string;
  readonly retrievedAt?: string;
}

export interface EligibilityGateEvidenceInput {
  readonly status: EligibilityEvidenceStatus;
  readonly sources: readonly EligibilityGateSourceRef[];
  readonly note?: string;
}

export type EligibilityIntakeInput = Partial<
  Record<SecuredTransactionEligibilityGateId, EligibilityGateEvidenceInput>
>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSource(value: unknown, gateId: string, index: number): EligibilityGateSourceRef {
  if (!isPlainObject(value)) {
    throw new Error(`Gate "${gateId}" sources[${index}] must be an object.`);
  }
  const { kind, id, label, sourceUri, retrievedAt } = value;

  if (typeof kind !== "string" || !KNOWN_SOURCE_KINDS.has(kind as EligibilityEvidenceSourceKind)) {
    throw new Error(
      `Gate "${gateId}" sources[${index}] has an unsupported kind. Expected one of: document, registry, filing, authority, user-confirmed.`,
    );
  }
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(`Gate "${gateId}" sources[${index}] requires a non-empty id.`);
  }
  if (typeof label !== "string" || !label.trim()) {
    throw new Error(`Gate "${gateId}" sources[${index}] requires a non-empty label.`);
  }
  if (sourceUri !== undefined && typeof sourceUri !== "string") {
    throw new Error(`Gate "${gateId}" sources[${index}] sourceUri must be text when provided.`);
  }
  if (retrievedAt !== undefined && typeof retrievedAt !== "string") {
    throw new Error(`Gate "${gateId}" sources[${index}] retrievedAt must be text when provided.`);
  }

  return {
    kind: kind as EligibilityEvidenceSourceKind,
    id: id.trim(),
    label: label.trim(),
    ...(sourceUri?.trim() ? { sourceUri: sourceUri.trim() } : {}),
    ...(retrievedAt?.trim() ? { retrievedAt: retrievedAt.trim() } : {}),
  };
}

function validateGateEvidence(
  gateId: SecuredTransactionEligibilityGateId,
  value: unknown,
): EligibilityGateEvidenceInput {
  if (!isPlainObject(value)) {
    throw new Error(`Gate "${gateId}" evidence must be an object with a status field.`);
  }

  const { status, sources, note } = value;

  if (typeof status !== "string" || !KNOWN_STATUSES.has(status as EligibilityEvidenceStatus)) {
    throw new Error(
      `Gate "${gateId}" has an unsupported status. Expected one of: verified, unverified, contradicted.`,
    );
  }

  if (note !== undefined && typeof note !== "string") {
    throw new Error(`Gate "${gateId}" note must be text when provided.`);
  }

  const sourcesArray = sources === undefined ? [] : sources;
  if (!Array.isArray(sourcesArray)) {
    throw new Error(`Gate "${gateId}" sources must be an array.`);
  }

  return {
    status: status as EligibilityEvidenceStatus,
    sources: sourcesArray.map((source, index) => validateSource(source, gateId, index)),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
}

/**
 * Structural/runtime validation only. This never decides whether a gate is
 * legally satisfied -- that determination belongs solely to
 * evaluateSecuredTransactionEligibility. This function's job is to ensure
 * malformed or unexpected caller input cannot silently be treated as
 * verified evidence, and that a user-confirmed fact can never be relabeled
 * as independent documentary/registry evidence by the caller.
 */
export function validateSecuredTransactionEligibilityInput(
  input: Record<string, unknown>,
): EligibilityIntakeInput {
  if (!isPlainObject(input)) {
    throw new Error("Secured-Transaction Eligibility input must be an object.");
  }

  const unknownKeys = Object.keys(input).filter((key) => !KNOWN_GATE_IDS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Secured-Transaction Eligibility input contains unrecognized field(s): ${unknownKeys.join(", ")}.`,
    );
  }

  const validated: EligibilityIntakeInput = {};
  for (const gateId of SECURED_TRANSACTION_ELIGIBILITY_GATES) {
    const value = input[gateId];
    if (value === undefined) continue;
    validated[gateId] = validateGateEvidence(gateId, value);
  }

  return validated;
}

/**
 * Reduces the structured, persisted evidence model down to exactly the
 * shape the shared eligibility engine expects. The engine itself is never
 * changed -- it still only sees { status, sourceRefs: string[], note? }.
 */
export function toEngineInput(intake: EligibilityIntakeInput): SecuredTransactionEligibilityInput {
  const engineInput: SecuredTransactionEligibilityInput = {};
  for (const gateId of SECURED_TRANSACTION_ELIGIBILITY_GATES) {
    const entry = intake[gateId];
    if (!entry) continue;
    const evidence: EligibilityEvidence = {
      status: entry.status,
      sourceRefs: entry.sources.map((source) => source.id),
      ...(entry.note ? { note: entry.note } : {}),
    };
    engineInput[gateId] = evidence;
  }
  return engineInput;
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
    return validateSecuredTransactionEligibilityInput(input) as unknown as Record<string, unknown>;
  },
};

export default workflowRuntimePolicy;
