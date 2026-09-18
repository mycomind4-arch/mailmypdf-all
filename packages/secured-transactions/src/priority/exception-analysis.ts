import type {
  JurisdictionRuleResult,
  UccExceptionRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

export interface PriorityExceptionEvidence {
  readonly status:
    | "applies"
    | "does-not-apply"
    | "unresolved";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface PriorityExceptionAssessment {
  readonly status:
    | "clear"
    | "exception-applies"
    | "human-review-required"
    | "unsupported";

  readonly applicableExceptionIds: readonly string[];
  readonly unresolvedExceptionIds: readonly string[];

  readonly sourceRefIds: readonly string[];
  readonly authorityRefIds: readonly string[];

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * Exception analysis never applies a priority override automatically.
   */
  readonly canAutoOverridePriority: false;
}

export function assessPriorityExceptions(input: {
  rule: JurisdictionRuleResult<UccExceptionRuleData>;

  evidence?: Readonly<
    Record<string, PriorityExceptionEvidence | undefined>
  >;
}): PriorityExceptionAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [],
      sourceRefIds: [],
      authorityRefIds,
      reasons: [
        ...input.rule.reasonCodes,
        "Priority cannot be automatically compared without exception coverage.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [],
      sourceRefIds: [],
      authorityRefIds,
      reasons: [
        ...input.rule.reasonCodes,
        "Exception-rule coverage is unresolved.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  const evidence = input.evidence ?? {};

  const priorityExceptions =
    input.rule.value.exceptions.filter(
      (exception) => exception.target === "priority",
    );

  const applicableExceptionIds: string[] = [];
  const unresolvedExceptionIds: string[] = [];
  const sourceRefIds: string[] = [];

  for (const exception of priorityExceptions) {
    const item = evidence[exception.id];

    if (!item) {
      unresolvedExceptionIds.push(exception.id);
      continue;
    }

    sourceRefIds.push(
      ...item.sourceRefs.map((source) => source.id),
    );

    if (item.status === "applies") {
      applicableExceptionIds.push(exception.id);
    }

    if (item.status === "unresolved") {
      unresolvedExceptionIds.push(exception.id);
    }

    if (
      item.status === "does-not-apply" &&
      item.sourceRefs.length === 0
    ) {
      unresolvedExceptionIds.push(exception.id);
    }
  }

  if (applicableExceptionIds.length > 0) {
    return {
      status: "exception-applies",
      applicableExceptionIds,
      unresolvedExceptionIds,
      sourceRefIds: [...new Set(sourceRefIds)],
      authorityRefIds,
      reasons: [
        `Potential priority exception(s) apply: ${applicableExceptionIds.join(", ")}.`,
        "Automatic ordinary-rule ranking is blocked until the exception is reviewed.",
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  if (unresolvedExceptionIds.length > 0) {
    return {
      status: "human-review-required",
      applicableExceptionIds: [],
      unresolvedExceptionIds: [
        ...new Set(unresolvedExceptionIds),
      ],
      sourceRefIds: [...new Set(sourceRefIds)],
      authorityRefIds,
      reasons: [
        `Priority exception coverage remains unresolved for: ${[
          ...new Set(unresolvedExceptionIds),
        ].join(", ")}.`,
      ],
      requiresHumanReview: true,
      canAutoOverridePriority: false,
    };
  }

  return {
    status: "clear",
    applicableExceptionIds: [],
    unresolvedExceptionIds: [],
    sourceRefIds: [...new Set(sourceRefIds)],
    authorityRefIds,
    reasons: [
      "The reviewed exception evidence does not identify an applicable priority exception.",
    ],
    requiresHumanReview: false,
    canAutoOverridePriority: false,
  };
}
