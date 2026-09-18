import {
  resolveObligation,
  type ObligationResolutionResult,
  type ObligationTermClaim,
  type ObligationTermField,
} from "@mailmypdf/identity-capacity";

export type ValueEvidenceKind =
  | "money-advanced"
  | "goods-delivered"
  | "services-rendered"
  | "existing-obligation"
  | "commitment"
  | "other";

export interface ValueEvidenceClaim {
  id: string;
  kind: ValueEvidenceKind;
  effect: "supports" | "contradicts";
  sourceRefs: readonly string[];
  amount?: number;
  currency?: string;
  description?: string;
}

export interface ValueEvidenceAssessment {
  status: "supported" | "human-review-required" | "insufficient-evidence";
  supportingClaimIds: readonly string[];
  contradictingClaimIds: readonly string[];
  sourceRefs: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
}

export interface ObligationValueAssessment {
  status: "ready-for-further-analysis" | "human-review-required" | "blocked";
  obligation: ObligationResolutionResult;
  valueEvidence: ValueEvidenceAssessment;
  reasons: readonly string[];
  requiresHumanReview: boolean;
  canProceedToFurtherAnalysis: boolean;
  /**
   * This package reconstructs evidence and does not independently determine
   * enforceability or whether a legal definition of "value" is satisfied.
   */
  legalValueDetermined: false;
}

function validAmount(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

/**
 * Evidence sufficiency only. This intentionally does not encode a legal
 * conclusion about whether a particular form of consideration constitutes
 * "value" under any jurisdiction's law.
 */
export function assessValueEvidence(
  claims: readonly ValueEvidenceClaim[],
): ValueEvidenceAssessment {
  if (claims.length === 0) {
    return {
      status: "insufficient-evidence",
      supportingClaimIds: [],
      contradictingClaimIds: [],
      sourceRefs: [],
      reasons: ["No value evidence was supplied."],
      requiresHumanReview: false,
    };
  }

  const invalid = claims.filter(
    (claim) =>
      !claim.id.trim() ||
      claim.sourceRefs.length === 0 ||
      !validAmount(claim.amount) ||
      (claim.currency !== undefined && !claim.currency.trim()),
  );

  if (invalid.length > 0) {
    return {
      status: "human-review-required",
      supportingClaimIds: claims.filter((claim) => claim.effect === "supports").map((claim) => claim.id),
      contradictingClaimIds: claims.filter((claim) => claim.effect === "contradicts").map((claim) => claim.id),
      sourceRefs: [...new Set(claims.flatMap((claim) => claim.sourceRefs))],
      reasons: ["One or more value-evidence claims are malformed or lack source provenance."],
      requiresHumanReview: true,
    };
  }

  const supporting = claims.filter((claim) => claim.effect === "supports");
  const contradicting = claims.filter((claim) => claim.effect === "contradicts");
  const sourceRefs = [...new Set(claims.flatMap((claim) => claim.sourceRefs))];

  if (supporting.length === 0) {
    return {
      status: contradicting.length > 0 ? "human-review-required" : "insufficient-evidence",
      supportingClaimIds: [],
      contradictingClaimIds: contradicting.map((claim) => claim.id),
      sourceRefs,
      reasons: [
        contradicting.length > 0
          ? "The supplied evidence contradicts the asserted value basis and requires review."
          : "No supporting value evidence was supplied.",
      ],
      requiresHumanReview: contradicting.length > 0,
    };
  }

  if (contradicting.length > 0) {
    return {
      status: "human-review-required",
      supportingClaimIds: supporting.map((claim) => claim.id),
      contradictingClaimIds: contradicting.map((claim) => claim.id),
      sourceRefs,
      reasons: ["Supporting and contradictory value evidence are both present."],
      requiresHumanReview: true,
    };
  }

  return {
    status: "supported",
    supportingClaimIds: supporting.map((claim) => claim.id),
    contradictingClaimIds: [],
    sourceRefs,
    reasons: [
      "Source-linked evidence supports that something of value was asserted or exchanged.",
      "This evidence assessment is not an independent legal conclusion that a jurisdiction-specific definition of value is satisfied.",
    ],
    requiresHumanReview: false,
  };
}

export function assessObligationAndValue(input: {
  obligationId: string;
  obligationClaims: readonly ObligationTermClaim[];
  requiredObligationFields?: readonly ObligationTermField[];
  valueClaims: readonly ValueEvidenceClaim[];
}): ObligationValueAssessment {
  const obligation = resolveObligation({
    obligationId: input.obligationId,
    claims: input.obligationClaims,
    requiredFields: input.requiredObligationFields,
  });
  const valueEvidence = assessValueEvidence(input.valueClaims);

  const requiresHumanReview =
    obligation.requiresHumanReview || valueEvidence.requiresHumanReview;
  const obligationBlocked =
    obligation.disposition === "insufficient-evidence" ||
    obligation.disposition === "resolved-with-gaps";
  const valueBlocked = valueEvidence.status === "insufficient-evidence";
  const canProceedToFurtherAnalysis =
    !requiresHumanReview && !obligationBlocked && !valueBlocked;

  const reasons = [
    ...obligation.reasons,
    ...valueEvidence.reasons,
  ];

  return {
    status: canProceedToFurtherAnalysis
      ? "ready-for-further-analysis"
      : requiresHumanReview
        ? "human-review-required"
        : "blocked",
    obligation,
    valueEvidence,
    reasons,
    requiresHumanReview,
    canProceedToFurtherAnalysis,
    legalValueDetermined: false,
  };
}
