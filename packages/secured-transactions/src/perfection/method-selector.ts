import type {
  JurisdictionRuleResult,
  UccPerfectionMethod,
  UccPerfectionRuleData,
} from "@mailmypdf/jurisdiction-rules";

export interface PerfectionMethodSelection {
  status: "selected" | "human-review-required" | "blocked" | "unsupported";
  jurisdiction: string;
  ruleId?: string;
  selectedMethod?: UccPerfectionMethod;
  allowedMethods: readonly UccPerfectionMethod[];
  requiredConditions: readonly string[];
  authorityRefIds: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
  legalSufficiencyDetermined: false;
}

export function selectPerfectionMethod(input: {
  rule: JurisdictionRuleResult<UccPerfectionRuleData>;
  requestedMethod?: UccPerfectionMethod;
}): PerfectionMethodSelection {
  const authorityRefIds = input.rule.authorityRefs.map((authority) => authority.id);

  if (input.rule.status === "unsupported") {
    return {
      status: "unsupported",
      jurisdiction: input.rule.jurisdiction,
      allowedMethods: [],
      requiredConditions: [],
      authorityRefIds,
      reasons: [...input.rule.reasonCodes],
      requiresHumanReview: false,
      legalSufficiencyDetermined: false,
    };
  }

  if (
    input.rule.status !== "resolved" ||
    input.rule.requiresHumanReview ||
    !input.rule.value
  ) {
    return {
      status: "human-review-required",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      allowedMethods: input.rule.value?.allowedMethods ?? [],
      requiredConditions: input.rule.value?.requiredConditions ?? [],
      authorityRefIds,
      reasons: [
        ...input.rule.reasonCodes,
        "The jurisdiction rule result is not a single review-free resolved rule.",
      ],
      requiresHumanReview: true,
      legalSufficiencyDetermined: false,
    };
  }

  const allowedMethods = [...new Set(input.rule.value.allowedMethods)];
  if (allowedMethods.length === 0) {
    return {
      status: "blocked",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      allowedMethods,
      requiredConditions: input.rule.value.requiredConditions ?? [],
      authorityRefIds,
      reasons: ["The supported rule pack does not identify an available perfection method for this input."],
      requiresHumanReview: false,
      legalSufficiencyDetermined: false,
    };
  }

  if (input.requestedMethod) {
    if (!allowedMethods.includes(input.requestedMethod)) {
      return {
        status: "blocked",
        jurisdiction: input.rule.jurisdiction,
        ruleId: input.rule.ruleId,
        allowedMethods,
        requiredConditions: input.rule.value.requiredConditions ?? [],
        authorityRefIds,
        reasons: [`Requested method ${input.requestedMethod} is not listed by the resolved rule pack.`],
        requiresHumanReview: false,
        legalSufficiencyDetermined: false,
      };
    }

    return {
      status: "selected",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      selectedMethod: input.requestedMethod,
      allowedMethods,
      requiredConditions: input.rule.value.requiredConditions ?? [],
      authorityRefIds,
      reasons: ["The requested method is listed by the resolved authority-backed rule pack."],
      requiresHumanReview: false,
      legalSufficiencyDetermined: false,
    };
  }

  if (allowedMethods.length === 1) {
    return {
      status: "selected",
      jurisdiction: input.rule.jurisdiction,
      ruleId: input.rule.ruleId,
      selectedMethod: allowedMethods[0],
      allowedMethods,
      requiredConditions: input.rule.value.requiredConditions ?? [],
      authorityRefIds,
      reasons: ["The resolved rule pack exposes exactly one supported method for the supplied rule context."],
      requiresHumanReview: false,
      legalSufficiencyDetermined: false,
    };
  }

  return {
    status: "human-review-required",
    jurisdiction: input.rule.jurisdiction,
    ruleId: input.rule.ruleId,
    allowedMethods,
    requiredConditions: input.rule.value.requiredConditions ?? [],
    authorityRefIds,
    reasons: ["More than one method is supported by the resolved rule pack; the workflow must choose based on additional facts and review."],
    requiresHumanReview: true,
    legalSufficiencyDetermined: false,
  };
}
