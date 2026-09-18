import type {
  JurisdictionRuleResult,
  UccPriorityComparisonStep,
  UccPriorityRuleData,
} from "@mailmypdf/jurisdiction-rules";

import {
  assessPriorityAnalysisReadiness,
  type CompetingInterestEvidenceRecord,
  type CompetingInterestMatrix,
} from "./priority-readiness.js";

import type {
  PriorityExceptionAssessment,
} from "./exception-analysis.js";

export interface PriorityDetermination {
  readonly status:
    | "evidence-supports-first-priority"
    | "evidence-supports-not-first-priority"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly subjectRecordId: string;

  readonly rankedRecordIds: readonly string[];
  readonly leadingRecordIds: readonly string[];

  readonly ruleId?: string;

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * This is an evidence/rule finding rather than a judicial or legal
   * certification of priority.
   */
  readonly priorityLegallyDetermined: false;

  readonly canProceedToConsequentialAction: false;
}

function fieldValue(
  record: CompetingInterestEvidenceRecord,
  field: string,
): unknown {
  switch (field) {
    case "eventDate":
      return record.eventDate;

    case "externalRecordId":
      return record.externalRecordId;

    case "status":
      return record.status;

    case "interestKind":
      return record.interestKind;

    case "claimantEntityId":
      return record.claimantEntityId;

    case "jurisdiction":
      return record.jurisdiction;

    default:
      return record.attributes?.[field];
  }
}

function normalizedComparable(
  value: unknown,
  step: UccPriorityComparisonStep,
): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (step.valueType === "date") {
    const parsed = Date.parse(String(value));

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  if (step.valueType === "number") {
    const parsed =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return String(value);
}

function comparePrimitive(
  left: string | number,
  right: string | number,
): number {
  if (left === right) return 0;

  return left < right
    ? -1
    : 1;
}

function compareRecords(
  left: CompetingInterestEvidenceRecord,
  right: CompetingInterestEvidenceRecord,
  steps: readonly UccPriorityComparisonStep[],
): number | null {
  for (const step of steps) {
    const leftValue = normalizedComparable(
      fieldValue(left, step.field),
      step,
    );

    const rightValue = normalizedComparable(
      fieldValue(right, step.field),
      step,
    );

    if (leftValue === null || rightValue === null) {
      return null;
    }

    const raw = comparePrimitive(leftValue, rightValue);

    if (raw !== 0) {
      return step.direction === "ascending"
        ? raw
        : -raw;
    }
  }

  return 0;
}

export function determinePriorityFromRule(input: {
  matrix: CompetingInterestMatrix;

  rule: JurisdictionRuleResult<UccPriorityRuleData>;

  exceptionAssessment: PriorityExceptionAssessment;

  subjectRecordId: string;
}): PriorityDetermination {
  const subjectRecordId = input.subjectRecordId.trim();

  if (!subjectRecordId) {
    return {
      status: "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: ["Subject competing-interest record id is required."],
      requiresHumanReview: false,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const readiness = assessPriorityAnalysisReadiness({
    matrix: input.matrix,
    rule: input.rule,
  });

  if (readiness.status === "unsupported") {
    return {
      status: "unsupported",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: readiness.reasons,
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (readiness.status !== "ready-for-rule-analysis") {
    return {
      status: readiness.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: readiness.reasons,
      requiresHumanReview: readiness.requiresHumanReview,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (input.exceptionAssessment.status !== "clear") {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: readiness.ruleId,
      reasons: input.exceptionAssessment.reasons,
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    !input.rule.value ||
    !input.rule.ruleId
  ) {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "Priority rule data is not fully resolved.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const steps =
    input.rule.value.comparisonSteps ?? [];

  if (steps.length === 0) {
    return {
      status: "unsupported",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "The authority-backed priority rule does not define deterministic comparison steps.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const records = [...input.matrix.records];

  const subject =
    records.find(
      (record) => record.id === subjectRecordId,
    );

  if (!subject) {
    return {
      status: "blocked",
      subjectRecordId,
      rankedRecordIds: [],
      leadingRecordIds: [],
      ruleId: input.rule.ruleId,
      reasons: [
        "The subject record is not present in the competing-interest matrix.",
      ],
      requiresHumanReview: false,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  for (const record of records) {
    for (const step of steps) {
      if (
        normalizedComparable(
          fieldValue(record, step.field),
          step,
        ) === null
      ) {
        return {
          status: "blocked",
          subjectRecordId,
          rankedRecordIds: [],
          leadingRecordIds: [],
          ruleId: input.rule.ruleId,
          reasons: [
            `Record ${record.id} lacks a usable comparison value for ${step.field}.`,
          ],
          requiresHumanReview: false,
          priorityLegallyDetermined: false,
          canProceedToConsequentialAction: false,
        };
      }
    }
  }

  records.sort((left, right) => {
    const result = compareRecords(
      left,
      right,
      steps,
    );

    if (result === null) {
      return 0;
    }

    if (result !== 0) {
      return result;
    }

    return left.id.localeCompare(right.id);
  });

  const leading = records.filter((record) => {
    const result = compareRecords(
      record,
      records[0]!,
      steps,
    );

    return result === 0;
  });

  const rankedRecordIds =
    records.map((record) => record.id);

  const leadingRecordIds =
    leading.map((record) => record.id);

  if (
    leadingRecordIds.includes(subjectRecordId) &&
    leadingRecordIds.length > 1
  ) {
    return {
      status: "human-review-required",
      subjectRecordId,
      rankedRecordIds,
      leadingRecordIds,
      ruleId: input.rule.ruleId,
      reasons: [
        "The authority-backed comparison produces a tie among leading records.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (leadingRecordIds[0] === subjectRecordId) {
    return {
      status: "evidence-supports-first-priority",
      subjectRecordId,
      rankedRecordIds,
      leadingRecordIds,
      ruleId: input.rule.ruleId,
      reasons: [
        "The subject record ranks first under the deterministic comparison supplied by the resolved authority-backed rule pack.",
        "This is an evidence-based finding for human review, not a legal certification of first priority.",
      ],
      requiresHumanReview: true,
      priorityLegallyDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  return {
    status: "evidence-supports-not-first-priority",
    subjectRecordId,
    rankedRecordIds,
    leadingRecordIds,
    ruleId: input.rule.ruleId,
    reasons: [
      `Another record ranks ahead of the subject record under the resolved authority-backed comparison: ${leadingRecordIds.join(", ")}.`,
    ],
    requiresHumanReview: true,
    priorityLegallyDetermined: false,
    canProceedToConsequentialAction: false,
  };
}
