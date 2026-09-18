import type {
  JurisdictionRuleResult,
  UccFilingLocationRuleData,
  UccGoverningLawRuleData,
} from "@mailmypdf/jurisdiction-rules";

import type {
  SecuredTransactionSourceRef,
} from "../types.js";

export type RuleFactEvidenceStatus =
  | "supported"
  | "unresolved"
  | "contradicted";

export interface RuleFactEvidence {
  readonly status: RuleFactEvidenceStatus;
  readonly sourceRefs: readonly SecuredTransactionSourceRef[];
  readonly note?: string;
}

export interface GoverningLawFilingLocationAssessment {
  readonly status:
    | "supported-for-review"
    | "human-review-required"
    | "blocked"
    | "unsupported";

  readonly governingLawJurisdiction?: string;
  readonly filingOfficeId?: string;
  readonly filingOfficeLabel?: string;

  readonly governingLawRuleId?: string;
  readonly filingLocationRuleId?: string;

  readonly authorityRefIds: readonly string[];
  readonly factSourceRefIds: readonly string[];

  readonly missingFacts: readonly string[];
  readonly unresolvedFacts: readonly string[];
  readonly contradictedFacts: readonly string[];

  readonly reasons: readonly string[];

  readonly requiresHumanReview: boolean;

  /**
   * This analysis is intentionally review-only. It does not independently
   * establish a binding legal conclusion.
   */
  readonly legalConclusionDetermined: false;
  readonly canProceedToConsequentialAction: false;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function factStatus(input: {
  requiredFacts: readonly string[];
  evidence: Readonly<Record<string, RuleFactEvidence | undefined>>;
}) {
  const missing: string[] = [];
  const unresolved: string[] = [];
  const contradicted: string[] = [];
  const sourceIds: string[] = [];

  for (const fact of input.requiredFacts) {
    const evidence = input.evidence[fact];

    if (!evidence) {
      missing.push(fact);
      continue;
    }

    sourceIds.push(...evidence.sourceRefs.map((source) => source.id));

    if (
      evidence.status === "supported" &&
      evidence.sourceRefs.length === 0
    ) {
      missing.push(fact);
      continue;
    }

    if (evidence.status === "unresolved") {
      unresolved.push(fact);
    }

    if (evidence.status === "contradicted") {
      contradicted.push(fact);
    }
  }

  return {
    missing: unique(missing),
    unresolved: unique(unresolved),
    contradicted: unique(contradicted),
    sourceIds: unique(sourceIds),
  };
}

export function assessGoverningLawAndFilingLocation(input: {
  governingLawRule: JurisdictionRuleResult<UccGoverningLawRuleData>;
  filingLocationRule: JurisdictionRuleResult<UccFilingLocationRuleData>;

  factEvidence?: Readonly<
    Record<string, RuleFactEvidence | undefined>
  >;
}): GoverningLawFilingLocationAssessment {
  const { governingLawRule, filingLocationRule } = input;

  const authorityRefIds = unique([
    ...governingLawRule.authorityRefs.map((authority) => authority.id),
    ...filingLocationRule.authorityRefs.map((authority) => authority.id),
  ]);

  if (
    governingLawRule.status === "unsupported" ||
    filingLocationRule.status === "unsupported"
  ) {
    return {
      status: "unsupported",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: unique([
        ...governingLawRule.reasonCodes,
        ...filingLocationRule.reasonCodes,
        "Authority-backed governing-law and filing-location coverage is required.",
      ]),
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    governingLawRule.status !== "resolved" ||
    filingLocationRule.status !== "resolved" ||
    governingLawRule.requiresHumanReview ||
    filingLocationRule.requiresHumanReview ||
    !governingLawRule.ruleId ||
    !filingLocationRule.ruleId ||
    !governingLawRule.value ||
    !filingLocationRule.value
  ) {
    return {
      status: "human-review-required",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: unique([
        ...governingLawRule.reasonCodes,
        ...filingLocationRule.reasonCodes,
        "Governing-law or filing-location rule coverage is unresolved.",
      ]),
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const governingLawJurisdiction =
    governingLawRule.value.governingLawJurisdiction.trim();

  const filingOfficeId =
    filingLocationRule.value.filingOfficeId.trim();

  const filingOfficeLabel =
    filingLocationRule.value.filingOfficeLabel.trim();

  if (
    !governingLawJurisdiction ||
    !filingOfficeId ||
    !filingOfficeLabel
  ) {
    return {
      status: "blocked",
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: [],
      missingFacts: [],
      unresolvedFacts: [],
      contradictedFacts: [],
      reasons: [
        "Resolved jurisdiction rule data is missing required output values.",
      ],
      requiresHumanReview: false,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  const requiredFacts = unique([
    ...governingLawRule.value.requiredFacts,
    ...(filingLocationRule.value.requiredFacts ?? []),
  ]);

  const facts = factStatus({
    requiredFacts,
    evidence: input.factEvidence ?? {},
  });

  if (facts.contradicted.length > 0) {
    return {
      status: "human-review-required",
      governingLawJurisdiction,
      filingOfficeId,
      filingOfficeLabel,
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: facts.sourceIds,
      missingFacts: facts.missing,
      unresolvedFacts: facts.unresolved,
      contradictedFacts: facts.contradicted,
      reasons: [
        `Required jurisdiction fact(s) are contradicted: ${facts.contradicted.join(", ")}.`,
      ],
      requiresHumanReview: true,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  if (
    facts.missing.length > 0 ||
    facts.unresolved.length > 0
  ) {
    return {
      status: "blocked",
      governingLawJurisdiction,
      filingOfficeId,
      filingOfficeLabel,
      governingLawRuleId: governingLawRule.ruleId,
      filingLocationRuleId: filingLocationRule.ruleId,
      authorityRefIds,
      factSourceRefIds: facts.sourceIds,
      missingFacts: facts.missing,
      unresolvedFacts: facts.unresolved,
      contradictedFacts: [],
      reasons: [
        "Required jurisdiction facts are incomplete or unresolved.",
      ],
      requiresHumanReview: false,
      legalConclusionDetermined: false,
      canProceedToConsequentialAction: false,
    };
  }

  return {
    status: "supported-for-review",
    governingLawJurisdiction,
    filingOfficeId,
    filingOfficeLabel,
    governingLawRuleId: governingLawRule.ruleId,
    filingLocationRuleId: filingLocationRule.ruleId,
    authorityRefIds,
    factSourceRefIds: facts.sourceIds,
    missingFacts: [],
    unresolvedFacts: [],
    contradictedFacts: [],
    reasons: [
      "Authority-backed rule packs and their required facts support the proposed governing-law and filing-location analysis.",
      "A human must review the conclusion before it is used for a filing or other consequential action.",
    ],
    requiresHumanReview: true,
    legalConclusionDetermined: false,
    canProceedToConsequentialAction: false,
  };
}
