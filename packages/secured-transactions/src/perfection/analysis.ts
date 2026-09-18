import type {
  JurisdictionRuleResult,
  UccPerfectionRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

import type {
  PerfectionMethodSelection,
} from "./method-selector.js";

import type {
  PerfectionEvidenceVerification,
} from "./verification.js";

export interface PerfectionConditionEvidence {
  readonly status:
    | "supported"
    | "unresolved"
    | "contradicted";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
}

export interface PerfectionAuthorityAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly ruleId?: string;
  readonly method?: string;

  readonly authorityRefIds: readonly string[];
  readonly conditionSourceRefIds: readonly string[];

  readonly missingConditions: readonly string[];
  readonly unresolvedConditions: readonly string[];
  readonly contradictedConditions: readonly string[];

  readonly reasons: readonly string[];

  readonly evidenceSupportsPerfectionElements: boolean;
  readonly requiresHumanReview: boolean;

  readonly perfectionLegallyDetermined: false;
}

export function assessPerfectionUnderRule(input: {
  selection: PerfectionMethodSelection;
  verification: PerfectionEvidenceVerification;

  rule: JurisdictionRuleResult<UccPerfectionRuleData>;

  conditionEvidence?: Readonly<
    Record<string, PerfectionConditionEvidence | undefined>
  >;
}): PerfectionAuthorityAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (
    input.selection.status !== "selected" ||
    !input.selection.selectedMethod
  ) {
    return {
      status: input.selection.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.selection.reasons,
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: input.selection.requiresHumanReview,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.verification.status !== "evidence-verified") {
    return {
      status: input.verification.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.verification.reasons,
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: input.verification.requiresHumanReview,
      perfectionLegallyDetermined: false,
    };
  }

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "No supported perfection rule pack is available.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.ruleId ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "Perfection rule coverage remains unresolved.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    !input.rule.value.allowedMethods.includes(
      input.selection.selectedMethod,
    )
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        "The selected method is not allowed by the resolved perfection rule.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  const evidence = input.conditionEvidence ?? {};

  const requiredConditions =
    input.rule.value.requiredConditions ?? [];

  const missingConditions: string[] = [];
  const unresolvedConditions: string[] = [];
  const contradictedConditions: string[] = [];
  const sourceIds: string[] = [];

  for (const condition of requiredConditions) {
    const item = evidence[condition];

    if (!item) {
      missingConditions.push(condition);
      continue;
    }

    sourceIds.push(...item.sourceRefs.map((source) => source.id));

    if (
      item.status === "supported" &&
      item.sourceRefs.length === 0
    ) {
      missingConditions.push(condition);
      continue;
    }

    if (item.status === "unresolved") {
      unresolvedConditions.push(condition);
    }

    if (item.status === "contradicted") {
      contradictedConditions.push(condition);
    }
  }

  if (contradictedConditions.length > 0) {
    return {
      status: "human-review-required",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions,
      reasons: [
        `Perfection condition(s) are contradicted: ${contradictedConditions.join(", ")}.`,
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: true,
      perfectionLegallyDetermined: false,
    };
  }

  if (
    missingConditions.length > 0 ||
    unresolvedConditions.length > 0
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      method: input.selection.selectedMethod,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions: [],
      reasons: [
        "Required perfection conditions remain incomplete or unresolved.",
      ],
      evidenceSupportsPerfectionElements: false,
      requiresHumanReview: false,
      perfectionLegallyDetermined: false,
    };
  }

  return {
    status: "supported-for-review",
    ruleId: input.rule.ruleId,
    method: input.selection.selectedMethod,
    authorityRefIds,
    conditionSourceRefIds: [...new Set(sourceIds)],
    missingConditions: [],
    unresolvedConditions: [],
    contradictedConditions: [],
    reasons: [
      "The recorded execution evidence and required authority-backed conditions support the proposed perfection finding.",
      "Human review remains required and this engine does not determine priority.",
    ],
    evidenceSupportsPerfectionElements: true,
    requiresHumanReview: true,
    perfectionLegallyDetermined: false,
  };
}
