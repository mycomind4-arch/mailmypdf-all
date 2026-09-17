import { createFinding, type Finding } from "@mailmypdf/intelligence";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type Capacity =
  | "individual"
  | "trustee"
  | "executor"
  | "administrator"
  | "personal-representative"
  | "manager"
  | "member"
  | "officer"
  | "agent"
  | "guarantor"
  | "custodian"
  | "other";

export type CapacityResolutionDisposition =
  | "resolved-single"
  | "resolved-multiple"
  | "human-review-required"
  | "insufficient-evidence";

export interface CapacityClaim {
  readonly id: string;
  readonly actorId: string;
  readonly capacity: Capacity;
  readonly principalEntityId?: string | undefined;
  readonly actionTypes?: readonly string[] | undefined;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedCapacityClaim {
  readonly claim: CapacityClaim;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
  readonly issues: readonly string[];
}

export interface ResolvedCapacity {
  readonly capacity: Capacity;
  readonly principalEntityId?: string | undefined;
  readonly confidence: number;
  readonly claimIds: readonly string[];
}

export interface CapacityResolutionResult {
  readonly actorId: string;
  readonly actionType?: string | undefined;
  readonly principalEntityId?: string | undefined;
  readonly disposition: CapacityResolutionDisposition;
  readonly primaryCapacity?: ResolvedCapacity | undefined;
  readonly supportedCapacities: readonly ResolvedCapacity[];
  readonly evaluatedClaims: readonly EvaluatedCapacityClaim[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const CAPACITY_RESOLUTION_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "capacity.trustee.instrument",
    purpose: "capacity-resolution",
    sourceTypes: ["organizational-document"],
    entityTypes: ["trustee"],
    score: 0.9,
    reason: "A governing trust instrument is strong evidence of trustee capacity when it identifies the actor and trust.",
  },
  {
    id: "capacity.trustee.court-order",
    purpose: "capacity-resolution",
    sourceTypes: ["court-order"],
    entityTypes: ["trustee"],
    score: 0.95,
    reason: "A court order is strong evidence of trustee capacity within its scope.",
  },
  {
    id: "capacity.estate.court-order",
    purpose: "capacity-resolution",
    sourceTypes: ["court-order"],
    entityTypes: ["executor", "administrator", "personal-representative"],
    score: 0.98,
    reason: "Probate letters or a court order are strong evidence of estate representative capacity.",
  },
  {
    id: "capacity.organization.governing-document",
    purpose: "capacity-resolution",
    sourceTypes: ["organizational-document"],
    entityTypes: ["manager", "member", "officer"],
    score: 0.9,
    reason: "Organizational records are strong evidence of a person's stated organizational capacity.",
  },
  {
    id: "capacity.organization.registry",
    purpose: "capacity-resolution",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["manager", "member", "officer"],
    score: 0.82,
    reason: "An official registry can strongly support an organizational role when that role is part of the registry record.",
  },
  {
    id: "capacity.agent.executed-contract",
    purpose: "capacity-resolution",
    sourceTypes: ["executed-contract"],
    entityTypes: ["agent"],
    score: 0.88,
    reason: "An executed agency agreement can strongly support agent capacity within the agreement's scope.",
  },
  {
    id: "capacity.agent.court-order",
    purpose: "capacity-resolution",
    sourceTypes: ["court-order"],
    entityTypes: ["agent"],
    score: 0.95,
    reason: "A court order can establish representative authority within its scope.",
  },
  {
    id: "capacity.guarantor.contract",
    purpose: "capacity-resolution",
    sourceTypes: ["executed-contract"],
    entityTypes: ["guarantor"],
    score: 0.9,
    reason: "An executed guaranty is strong evidence that the signer acted as guarantor for that obligation.",
  },
  {
    id: "capacity.individual.contract",
    purpose: "capacity-resolution",
    sourceTypes: ["executed-contract"],
    entityTypes: ["individual"],
    score: 0.8,
    reason: "An executed instrument signed in an individual capacity can strongly support that capacity for the instrument.",
  },
  {
    id: "capacity.custodian.court-order",
    purpose: "capacity-resolution",
    sourceTypes: ["court-order"],
    entityTypes: ["custodian"],
    score: 0.92,
    reason: "A court order can strongly establish custodial capacity within its scope.",
  },
];

const REPRESENTATIVE_CAPACITIES = new Set<Capacity>([
  "trustee",
  "executor",
  "administrator",
  "personal-representative",
  "manager",
  "member",
  "officer",
  "agent",
  "custodian",
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function claimConfidence(claim: CapacityClaim): number {
  const value = claim.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function actionMatches(claim: CapacityClaim, actionType?: string): boolean {
  if (!actionType || !claim.actionTypes || claim.actionTypes.length === 0) return true;
  return claim.actionTypes.includes("*") || claim.actionTypes.includes(actionType);
}

function evaluateClaim(
  claim: CapacityClaim,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedCapacityClaim {
  const sourceAuthority = evaluateSourceAuthority({
    source: claim.source,
    context: {
      purpose: "capacity-resolution",
      entityType: claim.capacity,
    },
    rules: [...CAPACITY_RESOLUTION_RULES, ...(rules ?? [])],
  });

  const issues: string[] = [];
  let combinedScore = clamp01(
    sourceAuthority.score * 0.85 + claimConfidence(claim) * 0.15,
  );

  if (REPRESENTATIVE_CAPACITIES.has(claim.capacity) && !claim.principalEntityId) {
    issues.push("Representative capacity is missing the principal/entity on whose behalf the actor is claimed to act.");
    combinedScore = Math.min(combinedScore, 0.49);
  }

  return {
    claim,
    sourceAuthority,
    combinedScore: Math.round(combinedScore * 1000) / 1000,
    issues,
  };
}

interface CapacityGroup {
  readonly capacity: Capacity;
  readonly principalEntityId?: string | undefined;
  readonly evaluations: readonly EvaluatedCapacityClaim[];
  readonly score: number;
  readonly maxAuthority: number;
}

function groupClaims(evaluated: readonly EvaluatedCapacityClaim[]): CapacityGroup[] {
  const map = new Map<string, EvaluatedCapacityClaim[]>();
  for (const item of evaluated) {
    const key = `${item.claim.capacity}|${item.claim.principalEntityId ?? ""}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.values()].map((evaluations) => {
    const sorted = [...evaluations].sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      return b.sourceAuthority.score - a.sourceAuthority.score;
    });
    const best = sorted[0]!;
    const corroboration = Math.min(0.04, Math.max(0, sorted.length - 1) * 0.01);
    return {
      capacity: best.claim.capacity,
      principalEntityId: best.claim.principalEntityId,
      evaluations: sorted,
      score: Math.round(clamp01(best.combinedScore + corroboration) * 1000) / 1000,
      maxAuthority: best.sourceAuthority.score,
    };
  }).sort((a, b) => b.score - a.score);
}

function toResolved(group: CapacityGroup): ResolvedCapacity {
  return {
    capacity: group.capacity,
    principalEntityId: group.principalEntityId,
    confidence: group.score,
    claimIds: group.evaluations.map((item) => item.claim.id),
  };
}

function collectRuleIds(evaluated: readonly EvaluatedCapacityClaim[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolveCapacity(input: {
  actorId: string;
  claims: readonly CapacityClaim[];
  actionType?: string;
  principalEntityId?: string;
  rules?: readonly SourceAuthorityRule[];
  minimumResolutionScore?: number;
}): CapacityResolutionResult {
  const applicable = input.claims.filter((claim) =>
    claim.actorId === input.actorId &&
    actionMatches(claim, input.actionType) &&
    (!input.principalEntityId || claim.principalEntityId === input.principalEntityId || claim.capacity === "individual"),
  );
  const evaluated = applicable.map((claim) => evaluateClaim(claim, input.rules));
  const minimum = input.minimumResolutionScore ?? 0.75;

  if (evaluated.length === 0) {
    return {
      actorId: input.actorId,
      actionType: input.actionType,
      principalEntityId: input.principalEntityId,
      disposition: "insufficient-evidence",
      supportedCapacities: [],
      evaluatedClaims: [],
      reasons: ["No applicable capacity claims were supplied for this actor/action context."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const groups = groupClaims(evaluated);
  const representativePrincipals = new Set(
    groups
      .filter((group) => REPRESENTATIVE_CAPACITIES.has(group.capacity) && group.score >= minimum)
      .map((group) => group.principalEntityId)
      .filter((value): value is string => Boolean(value)),
  );

  if (!input.principalEntityId && representativePrincipals.size > 1) {
    return {
      actorId: input.actorId,
      actionType: input.actionType,
      disposition: "human-review-required",
      supportedCapacities: [],
      evaluatedClaims: evaluated,
      reasons: ["Strong representative-capacity evidence points to more than one principal; the relevant principal must be identified for this action."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  const supportedGroups = groups.filter((group) => {
    const best = group.evaluations[0]!;
    return (
      group.score >= minimum &&
      group.maxAuthority >= 0.5 &&
      !best.sourceAuthority.requiresHumanReview &&
      best.issues.length === 0
    );
  });

  if (supportedGroups.length === 0) {
    const top = groups[0]!;
    const review = top.score >= 0.5 || top.evaluations[0]!.issues.length > 0;
    return {
      actorId: input.actorId,
      actionType: input.actionType,
      principalEntityId: input.principalEntityId,
      disposition: review ? "human-review-required" : "insufficient-evidence",
      supportedCapacities: [],
      evaluatedClaims: evaluated,
      reasons: review
        ? ["Capacity evidence exists but does not satisfy the deterministic resolution gate or lacks required principal information."]
        : ["Available capacity evidence is too weak to support a capacity finding."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: review,
    };
  }

  const supported = supportedGroups.map(toResolved);
  return {
    actorId: input.actorId,
    actionType: input.actionType,
    principalEntityId: input.principalEntityId,
    disposition: supported.length > 1 ? "resolved-multiple" : "resolved-single",
    primaryCapacity: supported[0],
    supportedCapacities: supported,
    evaluatedClaims: evaluated,
    reasons: [
      supported.length > 1
        ? "Multiple capacities are independently supported; capacities are not treated as mutually exclusive."
        : `Resolved capacity as ${supported[0]!.capacity} for the supplied context.`,
    ],
    ruleIds: collectRuleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function capacityResolutionToFinding(
  result: CapacityResolutionResult,
): Finding {
  const entities = [
    result.actorId,
    ...(result.supportedCapacities
      .map((capacity) => capacity.principalEntityId)
      .filter((value): value is string => Boolean(value))),
  ];

  return createFinding({
    findingType: "capacity_resolution",
    severity: result.requiresHumanReview ? "major" : "info",
    entityIds: [...new Set(entities)],
    explanation: [
      `Disposition: ${result.disposition}.`,
      result.primaryCapacity
        ? `Primary supported capacity: ${result.primaryCapacity.capacity}.`
        : "No controlling capacity was established.",
      ...result.reasons,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve the actor's principal, scope, or supporting authority before relying on representative capacity."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.capacity-resolution.v1",
      sourceRefs: result.evaluatedClaims.flatMap((item) => item.claim.source.sourceRefs ?? []),
    },
    confidence: result.primaryCapacity?.confidence ?? 0,
  });
}
