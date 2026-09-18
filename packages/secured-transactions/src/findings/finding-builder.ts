import type {
  SecuredTransactionFinding,
  SecuredTransactionFindingStatus,
  SecuredTransactionSourceRef,
} from "../types.js";

export interface SecuredTransactionFindingInput<T = unknown> {
  id: string;
  status: SecuredTransactionFindingStatus;
  value?: T;
  reasonCodes?: readonly string[];
  sourceRefs?: readonly SecuredTransactionSourceRef[];
  requiresHumanReview?: boolean;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueSources(
  values: readonly SecuredTransactionSourceRef[],
): SecuredTransactionSourceRef[] {
  return [...new Map(values.map((source) => [source.id, source])).values()];
}

export function createSecuredTransactionFinding<T = unknown>(
  input: SecuredTransactionFindingInput<T>,
): SecuredTransactionFinding<T> {
  const id = input.id.trim();
  if (!id) throw new Error("Secured-transaction finding id is required.");

  const sourceRefs = uniqueSources(input.sourceRefs ?? []);
  const reasonCodes = uniqueStrings(input.reasonCodes ?? []);

  if (input.status === "verified" && sourceRefs.length === 0) {
    throw new Error("A verified secured-transaction finding requires source provenance.");
  }
  if (input.status !== "verified" && reasonCodes.length === 0) {
    throw new Error("A non-verified secured-transaction finding requires at least one reason code.");
  }

  const requiresHumanReview =
    input.requiresHumanReview ??
    (input.status === "conditional" ||
      input.status === "unresolved" ||
      input.status === "blocked");

  return Object.freeze({
    id,
    status: input.status,
    value: input.value,
    reasonCodes,
    sourceRefs,
    requiresHumanReview,
  });
}

export function isEvidenceReadySecuredTransactionFinding(
  finding: SecuredTransactionFinding,
): boolean {
  return (
    finding.status === "verified" &&
    finding.sourceRefs.length > 0 &&
    !finding.requiresHumanReview
  );
}
