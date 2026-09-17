import { createFinding, type Finding, type SourceRef } from "@mailmypdf/intelligence";
import {
  normalizeName,
  type NormalizedName,
} from "./name-normalization.js";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type AuthoritativeNameDisposition =
  | "resolved"
  | "resolved-with-conflict"
  | "human-review-required"
  | "insufficient-evidence";

export interface AuthoritativeNameCandidate {
  readonly id: string;
  readonly rawName: string;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly entityId?: string | undefined;
  readonly subjectClassification?: string | undefined;
}

export interface EvaluatedNameCandidate {
  readonly candidate: AuthoritativeNameCandidate;
  readonly normalized: NormalizedName;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
}

export interface NameConflict {
  readonly candidateIds: readonly string[];
  readonly comparisonKeys: readonly string[];
  readonly severity: "strong" | "weak";
  readonly explanation: string;
}

export interface AuthoritativeNameResolution {
  readonly purpose: string;
  readonly jurisdiction?: string | undefined;
  readonly disposition: AuthoritativeNameDisposition;
  readonly authoritativeCandidateId?: string | undefined;
  readonly authoritativeName?: string | undefined;
  readonly confidence: number;
  readonly evaluatedCandidates: readonly EvaluatedNameCandidate[];
  readonly conflicts: readonly NameConflict[];
  readonly ruleIds: readonly string[];
  readonly reasons: readonly string[];
  readonly requiresHumanReview: boolean;
}

interface CandidateCluster {
  readonly key: string;
  readonly members: readonly EvaluatedNameCandidate[];
  readonly score: number;
  readonly maxAuthority: number;
  readonly best: EvaluatedNameCandidate;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function candidateConfidence(candidate: AuthoritativeNameCandidate): number {
  const value = candidate.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function evaluateCandidate(input: {
  candidate: AuthoritativeNameCandidate;
  purpose: string;
  jurisdiction?: string;
  entityType?: string;
  rules?: readonly SourceAuthorityRule[];
}): EvaluatedNameCandidate {
  const normalized = normalizeName(input.candidate.rawName);
  const sourceAuthority = evaluateSourceAuthority({
    source: input.candidate.source,
    context: {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      entityType: input.entityType,
    },
    rules: input.rules,
  });

  const combinedScore = Math.round(
    clamp01(sourceAuthority.score * 0.85 + candidateConfidence(input.candidate) * 0.15) * 1000,
  ) / 1000;

  return {
    candidate: input.candidate,
    normalized,
    sourceAuthority,
    combinedScore,
  };
}

function clusterCandidates(evaluated: readonly EvaluatedNameCandidate[]): CandidateCluster[] {
  const grouped = new Map<string, EvaluatedNameCandidate[]>();

  for (const item of evaluated) {
    const key = item.normalized.comparisonKey;
    if (!key) continue;
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return [...grouped.entries()].map(([key, members]) => {
    const sorted = [...members].sort((a, b) => {
      if (b.sourceAuthority.score !== a.sourceAuthority.score) {
        return b.sourceAuthority.score - a.sourceAuthority.score;
      }
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      return a.candidate.id.localeCompare(b.candidate.id);
    });
    const best = sorted[0]!;
    const corroborationBonus = Math.min(0.04, Math.max(0, sorted.length - 1) * 0.01);
    return {
      key,
      members: sorted,
      score: Math.round(clamp01(best.combinedScore + corroborationBonus) * 1000) / 1000,
      maxAuthority: best.sourceAuthority.score,
      best,
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.maxAuthority !== a.maxAuthority) return b.maxAuthority - a.maxAuthority;
    return a.key.localeCompare(b.key);
  });
}

function collectRuleIds(evaluated: readonly EvaluatedNameCandidate[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

function buildConflicts(clusters: readonly CandidateCluster[]): NameConflict[] {
  if (clusters.length <= 1) return [];
  const top = clusters[0]!;
  const conflicts: NameConflict[] = [];

  for (const other of clusters.slice(1)) {
    const severity: "strong" | "weak" = other.maxAuthority >= 0.75 ? "strong" : "weak";
    conflicts.push({
      candidateIds: [top.best.candidate.id, other.best.candidate.id],
      comparisonKeys: [top.key, other.key],
      severity,
      explanation:
        severity === "strong"
          ? "Different normalized names are supported by independently strong or authoritative sources."
          : "A lower-authority source supports a different normalized name and should remain visible in the audit trail.",
    });
  }
  return conflicts;
}

export function resolveAuthoritativeName(input: {
  purpose: string;
  candidates: readonly AuthoritativeNameCandidate[];
  jurisdiction?: string;
  entityType?: string;
  rules?: readonly SourceAuthorityRule[];
  minimumResolutionScore?: number;
}): AuthoritativeNameResolution {
  const minimumResolutionScore = input.minimumResolutionScore ?? 0.75;
  const reasons: string[] = [];

  const evaluated = input.candidates
    .filter((candidate) => candidate.rawName.trim().length > 0)
    .map((candidate) =>
      evaluateCandidate({
        candidate,
        purpose: input.purpose,
        jurisdiction: input.jurisdiction,
        entityType: input.entityType,
        rules: input.rules,
      }),
    );

  if (evaluated.length === 0) {
    return {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      disposition: "insufficient-evidence",
      confidence: 0,
      evaluatedCandidates: [],
      conflicts: [],
      ruleIds: [],
      reasons: ["No non-empty name candidates were supplied."],
      requiresHumanReview: false,
    };
  }

  const clusters = clusterCandidates(evaluated);
  if (clusters.length === 0) {
    return {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      disposition: "insufficient-evidence",
      confidence: 0,
      evaluatedCandidates: evaluated,
      conflicts: [],
      ruleIds: collectRuleIds(evaluated),
      reasons: ["Candidates were present but none produced a usable normalized name."],
      requiresHumanReview: true,
    };
  }

  const top = clusters[0]!;
  const conflicts = buildConflicts(clusters);
  const strongConflict = conflicts.some((conflict) => conflict.severity === "strong");
  const weakConflict = conflicts.some((conflict) => conflict.severity === "weak");

  if (strongConflict) {
    reasons.push("Conflicting normalized names are backed by strong sources; deterministic resolution is intentionally blocked.");
    return {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      disposition: "human-review-required",
      confidence: top.score,
      evaluatedCandidates: evaluated,
      conflicts,
      ruleIds: collectRuleIds(evaluated),
      reasons,
      requiresHumanReview: true,
    };
  }

  if (top.maxAuthority < 0.5) {
    reasons.push("The strongest available source is below the supporting-evidence threshold.");
    return {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      disposition: "insufficient-evidence",
      confidence: top.score,
      evaluatedCandidates: evaluated,
      conflicts,
      ruleIds: collectRuleIds(evaluated),
      reasons,
      requiresHumanReview: true,
    };
  }

  if (top.score < minimumResolutionScore || top.best.sourceAuthority.requiresHumanReview) {
    reasons.push("The leading candidate does not meet the configured deterministic resolution threshold or its provenance requires review.");
    return {
      purpose: input.purpose,
      jurisdiction: input.jurisdiction,
      disposition: "human-review-required",
      confidence: top.score,
      evaluatedCandidates: evaluated,
      conflicts,
      ruleIds: collectRuleIds(evaluated),
      reasons,
      requiresHumanReview: true,
    };
  }

  reasons.push(
    `Selected candidate ${top.best.candidate.id} because its source authority and corroborating evidence produced the strongest purpose-specific cluster.`,
  );
  if (weakConflict) {
    reasons.push("Lower-authority conflicting variants are preserved but do not override the leading authoritative cluster.");
  }

  return {
    purpose: input.purpose,
    jurisdiction: input.jurisdiction,
    disposition: weakConflict ? "resolved-with-conflict" : "resolved",
    authoritativeCandidateId: top.best.candidate.id,
    authoritativeName: top.best.candidate.rawName.trim(),
    confidence: top.score,
    evaluatedCandidates: evaluated,
    conflicts,
    ruleIds: collectRuleIds(evaluated),
    reasons,
    requiresHumanReview: false,
  };
}

function uniqueSourceRefs(resolution: AuthoritativeNameResolution): SourceRef[] {
  const seen = new Set<string>();
  const refs: SourceRef[] = [];

  for (const item of resolution.evaluatedCandidates) {
    for (const ref of item.candidate.source.sourceRefs ?? []) {
      const key = [
        ref.documentId,
        ref.page ?? "",
        ref.offset ?? "",
        ref.excerpt ?? "",
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

export function authoritativeNameResolutionToFinding(
  resolution: AuthoritativeNameResolution,
): Finding {
  const selected = resolution.authoritativeCandidateId
    ? resolution.evaluatedCandidates.find(
        (item) => item.candidate.id === resolution.authoritativeCandidateId,
      )
    : undefined;

  return createFinding({
    findingType: "authoritative_name_resolution",
    severity: resolution.requiresHumanReview ? "major" : "info",
    entityIds: selected?.candidate.entityId ? [selected.candidate.entityId] : [],
    explanation: [
      `Purpose: ${resolution.purpose}.`,
      `Disposition: ${resolution.disposition}.`,
      resolution.authoritativeName
        ? `Authoritative name candidate: ${resolution.authoritativeName}.`
        : "No authoritative name was established.",
      ...resolution.reasons,
    ].join(" "),
    recommendedAction: resolution.requiresHumanReview
      ? "Review the conflicting or insufficient source evidence before using a controlling name for a consequential action."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.authoritative-name.v1",
      sourceRefs: uniqueSourceRefs(resolution),
    },
    confidence: resolution.confidence,
  });
}
