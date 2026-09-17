import { createFinding, type Finding } from "@mailmypdf/intelligence";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type AssetInterestType =
  | "exclusive-owner"
  | "co-owner"
  | "recorded-owner"
  | "beneficial-owner"
  | "rights-holder"
  | "lessee"
  | "possessor"
  | "controller"
  | "custodian"
  | "secured-interest-holder"
  | "other";

export type OwnershipClaimEffect = "supports" | "contradicts";

export type OwnershipRightsDisposition =
  | "resolved"
  | "resolved-multiple-interests"
  | "resolved-with-conflict"
  | "human-review-required"
  | "insufficient-evidence";

export interface AssetInterestClaim {
  readonly id: string;
  readonly assetId: string;
  readonly holderEntityId: string;
  readonly interestType: AssetInterestType;
  readonly effect: OwnershipClaimEffect;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly share?: number | undefined;
  readonly effectiveAt?: string | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedAssetInterestClaim {
  readonly claim: AssetInterestClaim;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
  readonly issues: readonly string[];
}

export interface ResolvedAssetInterest {
  readonly assetId: string;
  readonly holderEntityId: string;
  readonly interestType: AssetInterestType;
  readonly confidence: number;
  readonly share?: number | undefined;
  readonly supportingClaimIds: readonly string[];
  readonly contradictingClaimIds: readonly string[];
}

export interface OwnershipRightsResult {
  readonly assetId: string;
  readonly disposition: OwnershipRightsDisposition;
  readonly interests: readonly ResolvedAssetInterest[];
  readonly evaluatedClaims: readonly EvaluatedAssetInterestClaim[];
  readonly conflicts: readonly string[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const OWNERSHIP_RIGHTS_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "ownership.recorded-title",
    purpose: "ownership-rights",
    sourceTypes: ["recorded-title"],
    entityTypes: ["exclusive-owner", "co-owner", "recorded-owner"],
    score: 1,
    reason: "A current recorded title is high-authority evidence of the recorded ownership interest for the asset it covers.",
  },
  {
    id: "ownership.court-order",
    purpose: "ownership-rights",
    sourceTypes: ["court-order"],
    score: 0.97,
    reason: "A court order is strong evidence of an ownership or rights determination within the order's scope.",
  },
  {
    id: "ownership.official-registry",
    purpose: "ownership-rights",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["exclusive-owner", "co-owner", "recorded-owner", "secured-interest-holder"],
    score: 0.92,
    reason: "An official asset or filing registry is strong evidence for the interest that registry is legally designed to record.",
  },
  {
    id: "ownership.executed-contract-rights",
    purpose: "ownership-rights",
    sourceTypes: ["executed-contract"],
    entityTypes: ["rights-holder", "lessee", "possessor", "controller", "secured-interest-holder"],
    score: 0.86,
    reason: "An executed agreement can strongly establish contractual rights, possession, control, leasehold, or a consensual security interest within its scope.",
  },
  {
    id: "ownership.organizational-document",
    purpose: "ownership-rights",
    sourceTypes: ["organizational-document"],
    entityTypes: ["beneficial-owner", "rights-holder", "controller"],
    score: 0.82,
    reason: "A governing organizational instrument can strongly support beneficial, contractual, or control rights within its scope.",
  },
  {
    id: "ownership.government-record",
    purpose: "ownership-rights",
    sourceTypes: ["tax-record"],
    entityTypes: ["recorded-owner"],
    score: 0.7,
    reason: "A tax record can support recorded ownership but may lag title changes and is not treated as conclusive title evidence.",
  },
  {
    id: "ownership.invoice",
    purpose: "ownership-rights",
    sourceTypes: ["invoice"],
    score: 0.45,
    reason: "An invoice may support acquisition or payment history but does not independently prove present ownership or rights.",
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function claimConfidence(claim: AssetInterestClaim): number {
  const value = claim.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function evaluateClaim(
  claim: AssetInterestClaim,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedAssetInterestClaim {
  const sourceAuthority = evaluateSourceAuthority({
    source: claim.source,
    context: {
      purpose: "ownership-rights",
      entityType: claim.interestType,
    },
    rules: [...OWNERSHIP_RIGHTS_RULES, ...(rules ?? [])],
  });

  const issues: string[] = [];
  let combinedScore = clamp01(
    sourceAuthority.score * 0.88 + claimConfidence(claim) * 0.12,
  );

  if (claim.share !== undefined && (!Number.isFinite(claim.share) || claim.share <= 0 || claim.share > 1)) {
    issues.push("Interest share must be greater than 0 and no more than 1.");
    combinedScore = Math.min(combinedScore, 0.49);
  }

  return {
    claim,
    sourceAuthority,
    combinedScore: Math.round(combinedScore * 1000) / 1000,
    issues,
  };
}

interface InterestGroup {
  readonly holderEntityId: string;
  readonly interestType: AssetInterestType;
  readonly support: readonly EvaluatedAssetInterestClaim[];
  readonly contradict: readonly EvaluatedAssetInterestClaim[];
  readonly strongestSupport: number;
  readonly strongestContradiction: number;
}

function groupClaims(
  evaluated: readonly EvaluatedAssetInterestClaim[],
): InterestGroup[] {
  const map = new Map<string, EvaluatedAssetInterestClaim[]>();
  for (const item of evaluated) {
    const key = `${item.claim.holderEntityId}|${item.claim.interestType}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.values()].map((items) => {
    const support = items
      .filter((item) => item.claim.effect === "supports")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const contradict = items
      .filter((item) => item.claim.effect === "contradicts")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const first = items[0]!;
    return {
      holderEntityId: first.claim.holderEntityId,
      interestType: first.claim.interestType,
      support,
      contradict,
      strongestSupport: support[0]?.combinedScore ?? 0,
      strongestContradiction: contradict[0]?.combinedScore ?? 0,
    };
  });
}

function ruleIds(evaluated: readonly EvaluatedAssetInterestClaim[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

function chosenShare(group: InterestGroup): number | undefined {
  for (const item of group.support) {
    if (item.claim.share !== undefined) return item.claim.share;
  }
  return undefined;
}

function toResolved(assetId: string, group: InterestGroup): ResolvedAssetInterest {
  return {
    assetId,
    holderEntityId: group.holderEntityId,
    interestType: group.interestType,
    confidence: group.strongestSupport,
    share: chosenShare(group),
    supportingClaimIds: group.support.map((item) => item.claim.id),
    contradictingClaimIds: group.contradict.map((item) => item.claim.id),
  };
}

export function resolveOwnershipRights(input: {
  assetId: string;
  claims: readonly AssetInterestClaim[];
  rules?: readonly SourceAuthorityRule[];
  strongEvidenceThreshold?: number;
}): OwnershipRightsResult {
  const threshold = input.strongEvidenceThreshold ?? 0.75;
  const evaluated = input.claims
    .filter((claim) => claim.assetId === input.assetId)
    .map((claim) => evaluateClaim(claim, input.rules));
  const groups = groupClaims(evaluated);

  if (evaluated.length === 0) {
    return {
      assetId: input.assetId,
      disposition: "insufficient-evidence",
      interests: [],
      evaluatedClaims: [],
      conflicts: [],
      reasons: ["No ownership or rights claims were supplied for this asset."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const conflicts: string[] = [];
  const supportedGroups: InterestGroup[] = [];

  for (const group of groups) {
    const strongSupport = group.strongestSupport >= threshold;
    const strongContradiction = group.strongestContradiction >= threshold;

    if (strongSupport && strongContradiction) {
      conflicts.push(
        `Strong evidence both supports and contradicts ${group.holderEntityId} holding ${group.interestType}.`,
      );
      continue;
    }

    if (strongSupport) supportedGroups.push(group);
  }

  const exclusiveOwners = supportedGroups.filter((group) => group.interestType === "exclusive-owner");
  if (exclusiveOwners.length > 1) {
    conflicts.push("More than one holder has strong evidence of an exclusive ownership interest.");
  }

  const invalid = evaluated.filter((item) => item.issues.length > 0);
  if (invalid.length > 0) {
    conflicts.push("One or more asset-interest claims contain invalid or incomplete interest data.");
  }

  if (conflicts.length > 0) {
    return {
      assetId: input.assetId,
      disposition: "human-review-required",
      interests: supportedGroups.map((group) => toResolved(input.assetId, group)),
      evaluatedClaims: evaluated,
      conflicts,
      reasons: ["Consequential ownership or rights conflicts cannot be resolved safely by source ranking alone."],
      ruleIds: ruleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  if (supportedGroups.length === 0) {
    const top = [...evaluated].sort((a, b) => b.combinedScore - a.combinedScore)[0]!;
    const review = top.combinedScore >= 0.5 || top.sourceAuthority.requiresHumanReview;
    return {
      assetId: input.assetId,
      disposition: review ? "human-review-required" : "insufficient-evidence",
      interests: [],
      evaluatedClaims: evaluated,
      conflicts: [],
      reasons: review
        ? ["Relevant ownership or rights evidence exists but does not satisfy the deterministic resolution gate."]
        : ["Available evidence is too weak to support an ownership or rights finding."],
      ruleIds: ruleIds(evaluated),
      requiresHumanReview: review,
    };
  }

  const interests = supportedGroups.map((group) => toResolved(input.assetId, group));
  const weakContradictions = groups.some((group) =>
    group.strongestContradiction > 0 &&
    group.strongestContradiction < threshold &&
    group.strongestSupport >= threshold,
  );

  return {
    assetId: input.assetId,
    disposition: weakContradictions
      ? "resolved-with-conflict"
      : interests.length > 1
        ? "resolved-multiple-interests"
        : "resolved",
    interests,
    evaluatedClaims: evaluated,
    conflicts: [],
    reasons: [
      "Resolved only the specific asset interests supported by strong purpose-specific evidence.",
      "Different interest types are preserved separately; title, possession, control, beneficial ownership, and contractual rights are not treated as synonyms.",
      ...(weakContradictions ? ["Lower-authority contradictory evidence remains visible in the audit trail."] : []),
    ],
    ruleIds: ruleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function ownershipRightsToFinding(result: OwnershipRightsResult): Finding {
  return createFinding({
    findingType: "ownership_rights_resolution",
    severity: result.requiresHumanReview ? "major" : "info",
    entityIds: [...new Set(result.interests.map((interest) => interest.holderEntityId))],
    explanation: [
      `Asset: ${result.assetId}.`,
      `Disposition: ${result.disposition}.`,
      result.interests.length > 0
        ? `Supported interests: ${result.interests.map((interest) => `${interest.holderEntityId}=${interest.interestType}`).join(", ")}.`
        : "No supported asset interest was established.",
      ...result.reasons,
      ...result.conflicts,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve conflicting or incomplete ownership/right evidence before relying on the asset interest for a consequential transaction."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.ownership-rights.v1",
      sourceRefs: result.evaluatedClaims.flatMap((item) => item.claim.source.sourceRefs ?? []),
    },
    confidence: result.interests.length > 0
      ? Math.max(...result.interests.map((interest) => interest.confidence))
      : 0,
  });
}
