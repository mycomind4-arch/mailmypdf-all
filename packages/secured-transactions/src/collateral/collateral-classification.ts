import {
  resolveOwnershipRights,
  type AssetInterestClaim,
  type OwnershipRightsResult,
} from "@mailmypdf/identity-capacity";

export type CollateralClass =
  | "goods"
  | "inventory"
  | "equipment"
  | "farm-products"
  | "consumer-goods"
  | "accounts"
  | "chattel-paper"
  | "instruments"
  | "documents"
  | "investment-property"
  | "deposit-accounts"
  | "commercial-tort-claims"
  | "general-intangibles"
  | "letter-of-credit-rights"
  | "money"
  | "fixtures"
  | "timber-to-be-cut"
  | "as-extracted-collateral"
  | "other"
  | "unknown";

export interface CollateralClassificationClaim {
  id: string;
  assetId: string;
  classification: CollateralClass;
  effect: "supports" | "contradicts";
  sourceRefs: readonly string[];
  confidence?: number;
  reason?: string;
}

export interface CollateralClassificationResult {
  assetId: string;
  disposition:
    | "resolved"
    | "human-review-required"
    | "insufficient-evidence";
  classification?: CollateralClass;
  confidence: number;
  supportingClaimIds: readonly string[];
  contradictingClaimIds: readonly string[];
  sourceRefs: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
}

export interface CollateralOwnershipClassificationAssessment {
  status: "ready-for-further-analysis" | "human-review-required" | "blocked";
  ownership: OwnershipRightsResult;
  classification: CollateralClassificationResult;
  canProceedToFurtherAnalysis: boolean;
  requiresHumanReview: boolean;
  /**
   * Ownership/right evidence is not itself a jurisdiction-specific conclusion
   * that a debtor has sufficient "rights in collateral" for attachment.
   */
  debtorRightsInCollateralDetermined: false;
}

function confidence(value: number | undefined): number {
  if (value === undefined) return 0.7;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Resolves only an evidence-supported candidate collateral class. It does not
 * infer a class from free text or apply jurisdiction-specific legal rules.
 */
export function resolveCollateralClassification(input: {
  assetId: string;
  claims: readonly CollateralClassificationClaim[];
  strongEvidenceThreshold?: number;
}): CollateralClassificationResult {
  const threshold = input.strongEvidenceThreshold ?? 0.75;
  const applicable = input.claims.filter((claim) => claim.assetId === input.assetId);

  if (applicable.length === 0) {
    return {
      assetId: input.assetId,
      disposition: "insufficient-evidence",
      confidence: 0,
      supportingClaimIds: [],
      contradictingClaimIds: [],
      sourceRefs: [],
      reasons: ["No collateral-classification evidence was supplied."],
      requiresHumanReview: false,
    };
  }

  const malformed = applicable.filter(
    (claim) =>
      !claim.id.trim() ||
      claim.sourceRefs.length === 0 ||
      claim.classification === "unknown",
  );
  if (malformed.length > 0) {
    return {
      assetId: input.assetId,
      disposition: "human-review-required",
      confidence: 0,
      supportingClaimIds: applicable.filter((c) => c.effect === "supports").map((c) => c.id),
      contradictingClaimIds: applicable.filter((c) => c.effect === "contradicts").map((c) => c.id),
      sourceRefs: [...new Set(applicable.flatMap((c) => c.sourceRefs))],
      reasons: ["One or more classification claims are unsourced, unknown, or malformed."],
      requiresHumanReview: true,
    };
  }

  const classes = [...new Set(applicable.map((claim) => claim.classification))];
  const strongSupported = classes
    .map((classification) => {
      const support = applicable
        .filter((c) => c.classification === classification && c.effect === "supports")
        .sort((a, b) => confidence(b.confidence) - confidence(a.confidence));
      const contradict = applicable
        .filter((c) => c.classification === classification && c.effect === "contradicts")
        .sort((a, b) => confidence(b.confidence) - confidence(a.confidence));
      return {
        classification,
        support,
        contradict,
        supportScore: confidence(support[0]?.confidence),
        contradictScore: confidence(contradict[0]?.confidence),
      };
    })
    .filter((group) => group.supportScore >= threshold);

  const directConflict = strongSupported.some(
    (group) => group.contradictScore >= threshold,
  );
  if (directConflict || strongSupported.length > 1) {
    return {
      assetId: input.assetId,
      disposition: "human-review-required",
      confidence: Math.max(0, ...strongSupported.map((group) => group.supportScore)),
      supportingClaimIds: strongSupported.flatMap((group) => group.support.map((c) => c.id)),
      contradictingClaimIds: strongSupported.flatMap((group) => group.contradict.map((c) => c.id)),
      sourceRefs: [...new Set(applicable.flatMap((c) => c.sourceRefs))],
      reasons: [
        directConflict
          ? "Strong evidence both supports and contradicts at least one proposed collateral classification."
          : "More than one collateral classification is strongly supported; classification requires review.",
      ],
      requiresHumanReview: true,
    };
  }

  const selected = strongSupported[0];
  if (!selected) {
    return {
      assetId: input.assetId,
      disposition: "insufficient-evidence",
      confidence: Math.max(0, ...applicable.map((c) => confidence(c.confidence))),
      supportingClaimIds: [],
      contradictingClaimIds: applicable.filter((c) => c.effect === "contradicts").map((c) => c.id),
      sourceRefs: [...new Set(applicable.flatMap((c) => c.sourceRefs))],
      reasons: ["Available classification evidence does not satisfy the deterministic support threshold."],
      requiresHumanReview: false,
    };
  }

  return {
    assetId: input.assetId,
    disposition: "resolved",
    classification: selected.classification,
    confidence: selected.supportScore,
    supportingClaimIds: selected.support.map((c) => c.id),
    contradictingClaimIds: selected.contradict.map((c) => c.id),
    sourceRefs: [...new Set(applicable.flatMap((c) => c.sourceRefs))],
    reasons: [
      "Resolved only the classification explicitly supported by sourced claims.",
      "Jurisdiction-specific legal classification and perfection consequences remain separate later analyses.",
    ],
    requiresHumanReview: false,
  };
}

export function assessCollateralOwnershipAndClassification(input: {
  assetId: string;
  ownershipClaims: readonly AssetInterestClaim[];
  classificationClaims: readonly CollateralClassificationClaim[];
}): CollateralOwnershipClassificationAssessment {
  const ownership = resolveOwnershipRights({
    assetId: input.assetId,
    claims: input.ownershipClaims,
  });
  const classification = resolveCollateralClassification({
    assetId: input.assetId,
    claims: input.classificationClaims,
  });

  const requiresHumanReview =
    ownership.requiresHumanReview || classification.requiresHumanReview;
  const ownershipBlocked =
    ownership.interests.length === 0 ||
    ownership.disposition === "insufficient-evidence";
  const classificationBlocked =
    classification.disposition === "insufficient-evidence";
  const canProceedToFurtherAnalysis =
    !requiresHumanReview && !ownershipBlocked && !classificationBlocked;

  return {
    status: canProceedToFurtherAnalysis
      ? "ready-for-further-analysis"
      : requiresHumanReview
        ? "human-review-required"
        : "blocked",
    ownership,
    classification,
    canProceedToFurtherAnalysis,
    requiresHumanReview,
    debtorRightsInCollateralDetermined: false,
  };
}
