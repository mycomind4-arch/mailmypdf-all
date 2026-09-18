import type {
  JurisdictionRuleResult,
  UccAttachmentRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

import type {
  AttachmentReadinessAssessment,
} from "./attachment-readiness.js";

export interface AttachmentConditionEvidence {
  readonly status:
    | "supported"
    | "unresolved"
    | "contradicted";

  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface AttachmentAuthorityAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly ruleId?: string;
  readonly authorityRefIds: readonly string[];
  readonly conditionSourceRefIds: readonly string[];

  readonly missingConditions: readonly string[];
  readonly unresolvedConditions: readonly string[];
  readonly contradictedConditions: readonly string[];

  readonly reasons: readonly string[];

  readonly evidenceSupportsAttachmentElements: boolean;
  readonly requiresHumanReview: boolean;

  /**
   * This result intentionally stops short of declaring legal attachment.
   */
  readonly attachmentLegallyDetermined: false;
}

export function assessAttachmentUnderRule(input: {
  readiness: AttachmentReadinessAssessment;
  rule: JurisdictionRuleResult<UccAttachmentRuleData>;

  conditionEvidence?: Readonly<
    Record<string, AttachmentConditionEvidence | undefined>
  >;
}): AttachmentAuthorityAssessment {
  const authorityRefIds =
    input.rule.authorityRefs.map((authority) => authority.id);

  if (!input.readiness.canProceedToAuthorityAnalysis) {
    return {
      status: input.readiness.requiresHumanReview
        ? "human-review-required"
        : "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: input.readiness.reasons,
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: input.readiness.requiresHumanReview,
      attachmentLegallyDetermined: false,
    };
  }

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "No supported attachment rule pack is available.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
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
      authorityRefIds,
      conditionSourceRefIds: [],
      missingConditions: [],
      unresolvedConditions: [],
      contradictedConditions: [],
      reasons: [
        ...input.rule.reasonCodes,
        "Attachment rule coverage is unresolved.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
    };
  }

  const evidence = input.conditionEvidence ?? {};

  const missingConditions: string[] = [];
  const unresolvedConditions: string[] = [];
  const contradictedConditions: string[] = [];
  const sourceIds: string[] = [];

  for (const condition of input.rule.value.requiredConditions) {
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
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions,
      reasons: [
        `Attachment condition(s) are contradicted: ${contradictedConditions.join(", ")}.`,
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: true,
      attachmentLegallyDetermined: false,
    };
  }

  if (
    missingConditions.length > 0 ||
    unresolvedConditions.length > 0
  ) {
    return {
      status: "blocked",
      ruleId: input.rule.ruleId,
      authorityRefIds,
      conditionSourceRefIds: [...new Set(sourceIds)],
      missingConditions,
      unresolvedConditions,
      contradictedConditions: [],
      reasons: [
        "Required attachment conditions are incomplete or unresolved.",
      ],
      evidenceSupportsAttachmentElements: false,
      requiresHumanReview: false,
      attachmentLegallyDetermined: false,
    };
  }

  return {
    status: "supported-for-review",
    ruleId: input.rule.ruleId,
    authorityRefIds,
    conditionSourceRefIds: [...new Set(sourceIds)],
    missingConditions: [],
    unresolvedConditions: [],
    contradictedConditions: [],
    reasons: [
      "The evidence supports each condition identified by the resolved authority-backed attachment rule.",
      "Human review remains required before treating attachment as legally established.",
    ],
    evidenceSupportsAttachmentElements: true,
    requiresHumanReview: true,
    attachmentLegallyDetermined: false,
  };
}
