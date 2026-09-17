import { createFinding, type Finding } from "@mailmypdf/intelligence";
import type {
  AuthorityJurisdiction,
  PurposeAuthoritativeRule,
} from "@mailmypdf/intelligence/authority";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type JurisdictionBasis =
  | "registered-organization"
  | "individual-residence"
  | "principal-place-of-business"
  | "asset-location"
  | "contract-choice-of-law"
  | "court-forum"
  | "agency-authority"
  | "filing-location"
  | "transaction-location"
  | "other";

export type JurisdictionClaimEffect = "supports" | "contradicts";
export type JurisdictionCardinality = "single" | "multiple";

export type JurisdictionResolutionDisposition =
  | "resolved"
  | "resolved-multiple"
  | "resolved-with-conflict"
  | "human-review-required"
  | "insufficient-evidence";

export interface JurisdictionCandidate {
  readonly id: string;
  readonly jurisdiction: AuthorityJurisdiction;
  readonly basis: JurisdictionBasis;
  readonly effect: JurisdictionClaimEffect;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly reason?: string | undefined;
}

export interface JurisdictionResolutionPolicy {
  readonly id: string;
  readonly purpose: string;
  readonly allowedBases: readonly JurisdictionBasis[];
  readonly preferredBases?: readonly JurisdictionBasis[] | undefined;
  readonly cardinality: JurisdictionCardinality;
  readonly minimumScore?: number | undefined;
  readonly notes?: readonly string[] | undefined;
  readonly authorityRuleId?: string | undefined;
}

export interface JurisdictionPolicyAuthorityValue {
  readonly allowedBases: readonly JurisdictionBasis[];
  readonly preferredBases?: readonly JurisdictionBasis[] | undefined;
  readonly cardinality: JurisdictionCardinality;
  readonly minimumScore?: number | undefined;
  readonly notes?: readonly string[] | undefined;
}

export interface EvaluatedJurisdictionCandidate {
  readonly candidate: JurisdictionCandidate;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
}

export interface ResolvedJurisdiction {
  readonly jurisdiction: AuthorityJurisdiction;
  readonly confidence: number;
  readonly supportingCandidateIds: readonly string[];
  readonly contradictingCandidateIds: readonly string[];
  readonly bases: readonly JurisdictionBasis[];
}

export interface JurisdictionResolutionResult {
  readonly purpose: string;
  readonly policyId: string;
  readonly authorityRuleId?: string | undefined;
  readonly disposition: JurisdictionResolutionDisposition;
  readonly jurisdictions: readonly ResolvedJurisdiction[];
  readonly evaluatedCandidates: readonly EvaluatedJurisdictionCandidate[];
  readonly conflicts: readonly string[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const JURISDICTION_SOURCE_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "jurisdiction.registered-organization.public-organic-record",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["public-organic-record"],
    entityTypes: ["registered-organization"],
    score: 1,
    reason: "A public organic record is high-authority evidence of the registered organization's jurisdiction of organization.",
  },
  {
    id: "jurisdiction.registered-organization.registry",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["registered-organization"],
    score: 0.97,
    reason: "An official organizational registry is strong evidence of the registered organization's jurisdiction of organization.",
  },
  {
    id: "jurisdiction.contract-choice.executed-contract",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["executed-contract"],
    entityTypes: ["contract-choice-of-law"],
    score: 0.94,
    reason: "An executed agreement is strong evidence of the agreement's stated choice-of-law provision, without deciding whether that provision controls a separate legal question.",
  },
  {
    id: "jurisdiction.court-forum.order",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["court-order"],
    entityTypes: ["court-forum"],
    score: 0.98,
    reason: "A court order is high-authority evidence of the forum in which that court matter is proceeding.",
  },
  {
    id: "jurisdiction.asset-location.title",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["recorded-title"],
    entityTypes: ["asset-location"],
    score: 0.96,
    reason: "A recorded title or property record is strong evidence of the location of the asset it covers.",
  },
  {
    id: "jurisdiction.agency-authority.notice",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["agency-notice"],
    entityTypes: ["agency-authority"],
    score: 0.88,
    reason: "An agency notice strongly supports the jurisdiction asserted for that agency matter, subject to independent authority analysis.",
  },
  {
    id: "jurisdiction.residence.government-id",
    purpose: "jurisdiction-resolution",
    sourceTypes: ["government-issued-id"],
    entityTypes: ["individual-residence"],
    score: 0.68,
    reason: "Government-issued identification can support an address or residence inference but may not prove current legal residence.",
  },
];

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function jurisdictionKey(jurisdiction: AuthorityJurisdiction): string {
  return [
    normalize(jurisdiction.country),
    normalize(jurisdiction.state),
    normalize(jurisdiction.county),
    normalize(jurisdiction.city),
  ].join("|");
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function candidateConfidence(candidate: JurisdictionCandidate): number {
  const value = candidate.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

export function validateJurisdictionPolicy(policy: JurisdictionResolutionPolicy): void {
  if (!policy.id.trim()) throw new Error("Jurisdiction policy requires a stable id.");
  if (!policy.purpose.trim()) throw new Error("Jurisdiction policy requires a non-empty purpose.");
  if (policy.allowedBases.length === 0) {
    throw new Error("Jurisdiction policy requires at least one allowed basis.");
  }
  if (new Set(policy.allowedBases).size !== policy.allowedBases.length) {
    throw new Error("Jurisdiction policy allowed bases must be unique.");
  }
  if (policy.preferredBases?.some((basis) => !policy.allowedBases.includes(basis))) {
    throw new Error("Preferred jurisdiction bases must also be allowed bases.");
  }
  if (policy.minimumScore !== undefined && (policy.minimumScore < 0 || policy.minimumScore > 1)) {
    throw new Error("Jurisdiction policy minimum score must be between 0 and 1.");
  }
}

export function jurisdictionPolicyFromAuthorityRule(
  rule: PurposeAuthoritativeRule<JurisdictionPolicyAuthorityValue>,
  purpose?: string,
): JurisdictionResolutionPolicy {
  if (rule.type !== "jurisdiction") {
    throw new Error(`Authority rule ${rule.id} is not a jurisdiction rule.`);
  }
  const selectedPurpose = purpose ?? rule.purposes[0];
  if (!selectedPurpose || !rule.purposes.includes(selectedPurpose)) {
    throw new Error(`Authority rule ${rule.id} does not cover the requested jurisdiction purpose.`);
  }
  const policy: JurisdictionResolutionPolicy = {
    id: `authority:${rule.id}`,
    purpose: selectedPurpose,
    allowedBases: rule.value.allowedBases,
    preferredBases: rule.value.preferredBases,
    cardinality: rule.value.cardinality,
    minimumScore: rule.value.minimumScore,
    notes: rule.value.notes,
    authorityRuleId: rule.id,
  };
  validateJurisdictionPolicy(policy);
  return policy;
}

function evaluateCandidate(
  candidate: JurisdictionCandidate,
  policy: JurisdictionResolutionPolicy,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedJurisdictionCandidate {
  const sourceAuthority = evaluateSourceAuthority({
    source: candidate.source,
    context: {
      purpose: "jurisdiction-resolution",
      entityType: candidate.basis,
    },
    rules: [...JURISDICTION_SOURCE_RULES, ...(rules ?? [])],
  });

  const preferred = policy.preferredBases?.includes(candidate.basis) ?? false;
  const preferenceBonus = preferred ? 0.04 : 0;
  const combinedScore = Math.round(
    clamp01(
      sourceAuthority.score * 0.88 +
      candidateConfidence(candidate) * 0.12 +
      preferenceBonus,
    ) * 1000,
  ) / 1000;

  return { candidate, sourceAuthority, combinedScore };
}

interface JurisdictionGroup {
  readonly jurisdiction: AuthorityJurisdiction;
  readonly supports: readonly EvaluatedJurisdictionCandidate[];
  readonly contradicts: readonly EvaluatedJurisdictionCandidate[];
  readonly strongestSupport: number;
  readonly strongestContradiction: number;
}

function groupCandidates(
  evaluated: readonly EvaluatedJurisdictionCandidate[],
): JurisdictionGroup[] {
  const map = new Map<string, EvaluatedJurisdictionCandidate[]>();
  for (const item of evaluated) {
    const key = jurisdictionKey(item.candidate.jurisdiction);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.values()].map((items) => {
    const supports = items
      .filter((item) => item.candidate.effect === "supports")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const contradicts = items
      .filter((item) => item.candidate.effect === "contradicts")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    return {
      jurisdiction: items[0]!.candidate.jurisdiction,
      supports,
      contradicts,
      strongestSupport: supports[0]?.combinedScore ?? 0,
      strongestContradiction: contradicts[0]?.combinedScore ?? 0,
    };
  });
}

function toResolved(group: JurisdictionGroup): ResolvedJurisdiction {
  return {
    jurisdiction: group.jurisdiction,
    confidence: group.strongestSupport,
    supportingCandidateIds: group.supports.map((item) => item.candidate.id),
    contradictingCandidateIds: group.contradicts.map((item) => item.candidate.id),
    bases: [...new Set(group.supports.map((item) => item.candidate.basis))],
  };
}

function collectRuleIds(evaluated: readonly EvaluatedJurisdictionCandidate[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolveJurisdiction(input: {
  policy: JurisdictionResolutionPolicy;
  candidates: readonly JurisdictionCandidate[];
  rules?: readonly SourceAuthorityRule[];
}): JurisdictionResolutionResult {
  validateJurisdictionPolicy(input.policy);
  const threshold = input.policy.minimumScore ?? 0.75;
  const evaluated = input.candidates
    .filter((candidate) => input.policy.allowedBases.includes(candidate.basis))
    .map((candidate) => evaluateCandidate(candidate, input.policy, input.rules));
  const groups = groupCandidates(evaluated);

  if (evaluated.length === 0) {
    return {
      purpose: input.policy.purpose,
      policyId: input.policy.id,
      authorityRuleId: input.policy.authorityRuleId,
      disposition: "insufficient-evidence",
      jurisdictions: [],
      evaluatedCandidates: [],
      conflicts: [],
      reasons: ["No jurisdiction candidates matched the policy's allowed legal/factual bases."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const conflicts: string[] = [];
  const supportedGroups: JurisdictionGroup[] = [];
  for (const group of groups) {
    if (group.strongestSupport >= threshold && group.strongestContradiction >= threshold) {
      conflicts.push(
        `Strong evidence both supports and contradicts jurisdiction ${jurisdictionKey(group.jurisdiction)}.`,
      );
      continue;
    }
    if (group.strongestSupport >= threshold) supportedGroups.push(group);
  }

  if (input.policy.cardinality === "single" && supportedGroups.length > 1) {
    conflicts.push(
      "The jurisdiction policy requires a single result, but more than one jurisdiction is strongly supported.",
    );
  }

  if (conflicts.length > 0) {
    return {
      purpose: input.policy.purpose,
      policyId: input.policy.id,
      authorityRuleId: input.policy.authorityRuleId,
      disposition: "human-review-required",
      jurisdictions: supportedGroups.map(toResolved),
      evaluatedCandidates: evaluated,
      conflicts,
      reasons: ["The applicable jurisdiction cannot be selected safely from conflicting strong evidence."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  if (supportedGroups.length === 0) {
    const top = [...evaluated].sort((a, b) => b.combinedScore - a.combinedScore)[0]!;
    const review = top.combinedScore >= 0.5 || top.sourceAuthority.requiresHumanReview;
    return {
      purpose: input.policy.purpose,
      policyId: input.policy.id,
      authorityRuleId: input.policy.authorityRuleId,
      disposition: review ? "human-review-required" : "insufficient-evidence",
      jurisdictions: [],
      evaluatedCandidates: evaluated,
      conflicts: [],
      reasons: review
        ? ["Relevant jurisdiction evidence exists but does not meet the policy's resolution threshold."]
        : ["Available jurisdiction evidence is too weak for the requested purpose."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: review,
    };
  }

  const jurisdictions = supportedGroups.map(toResolved);
  const weakConflict = groups.some((group) =>
    group.strongestSupport >= threshold &&
    group.strongestContradiction > 0 &&
    group.strongestContradiction < threshold,
  );

  return {
    purpose: input.policy.purpose,
    policyId: input.policy.id,
    authorityRuleId: input.policy.authorityRuleId,
    disposition: weakConflict
      ? "resolved-with-conflict"
      : jurisdictions.length > 1
        ? "resolved-multiple"
        : "resolved",
    jurisdictions,
    evaluatedCandidates: evaluated,
    conflicts: [],
    reasons: [
      "Jurisdiction was resolved only from bases explicitly allowed by the supplied purpose-specific policy.",
      "The engine does not treat residence, asset location, organization state, forum, or contract choice-of-law as interchangeable.",
      ...(input.policy.authorityRuleId
        ? [`Policy derived from authority rule ${input.policy.authorityRuleId}.`]
        : []),
      ...(weakConflict ? ["Lower-authority contradictory evidence remains visible in the audit trail."] : []),
    ],
    ruleIds: collectRuleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function jurisdictionResolutionToFinding(
  result: JurisdictionResolutionResult,
): Finding {
  const rendered = result.jurisdictions.map((item) =>
    [
      item.jurisdiction.country,
      item.jurisdiction.state,
      item.jurisdiction.county,
      item.jurisdiction.city,
    ].filter(Boolean).join("/"),
  );

  return createFinding({
    findingType: "jurisdiction_resolution",
    severity: result.requiresHumanReview ? "major" : "info",
    explanation: [
      `Purpose: ${result.purpose}.`,
      `Disposition: ${result.disposition}.`,
      `Resolved jurisdictions: ${rendered.join(", ") || "none"}.`,
      ...result.reasons,
      ...result.conflicts,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve the conflicting or insufficient jurisdiction evidence before applying jurisdiction-specific rules."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: result.authorityRuleId ?? "identity-capacity.jurisdiction-resolution.v1",
      sourceRefs: result.evaluatedCandidates.flatMap(
        (item) => item.candidate.source.sourceRefs ?? [],
      ),
    },
    confidence: result.jurisdictions.length > 0
      ? Math.max(...result.jurisdictions.map((item) => item.confidence))
      : 0,
  });
}
