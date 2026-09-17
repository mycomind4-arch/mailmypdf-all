import { createFinding, type Finding } from "@mailmypdf/intelligence";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type EntityClassification =
  | "individual"
  | "registered-organization"
  | "nonregistered-organization"
  | "trust"
  | "estate"
  | "sole-proprietorship"
  | "government-entity"
  | "unknown";

export type EntityClassificationDisposition =
  | "resolved"
  | "resolved-with-conflict"
  | "human-review-required"
  | "insufficient-evidence";

export interface EntityClassificationSignal {
  readonly id: string;
  readonly proposedType: EntityClassification;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly entityId?: string | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedEntityClassificationSignal {
  readonly signal: EntityClassificationSignal;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
}

export interface EntityClassificationResult {
  readonly disposition: EntityClassificationDisposition;
  readonly authoritativeType?: EntityClassification | undefined;
  readonly confidence: number;
  readonly evaluatedSignals: readonly EvaluatedEntityClassificationSignal[];
  readonly competingTypes: readonly EntityClassification[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const ENTITY_CLASSIFICATION_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "entity-classification.individual.government-id",
    purpose: "entity-classification",
    sourceTypes: ["government-issued-id"],
    entityTypes: ["individual"],
    score: 0.93,
    reason: "Government-issued identification is strong evidence that the named subject is an individual.",
  },
  {
    id: "entity-classification.registered-org.public-organic-record",
    purpose: "entity-classification",
    sourceTypes: ["public-organic-record"],
    entityTypes: ["registered-organization"],
    score: 1,
    reason: "A public organic record is authoritative evidence that the subject is a registered organization when the record applies.",
  },
  {
    id: "entity-classification.registered-org.registry",
    purpose: "entity-classification",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["registered-organization"],
    score: 0.97,
    reason: "An official organizational registry is strong evidence that the subject is a registered organization.",
  },
  {
    id: "entity-classification.trust.instrument",
    purpose: "entity-classification",
    sourceTypes: ["organizational-document"],
    entityTypes: ["trust"],
    score: 0.92,
    reason: "A trust instrument is strong evidence for classification as a trust when the document actually creates or governs the trust.",
  },
  {
    id: "entity-classification.trust.court-order",
    purpose: "entity-classification",
    sourceTypes: ["court-order"],
    entityTypes: ["trust"],
    score: 0.9,
    reason: "A court order addressing the trust is strong classification evidence within its scope.",
  },
  {
    id: "entity-classification.estate.court-order",
    purpose: "entity-classification",
    sourceTypes: ["court-order"],
    entityTypes: ["estate"],
    score: 0.97,
    reason: "A probate or other court order is strong evidence for classification as an estate.",
  },
  {
    id: "entity-classification.sole-proprietorship.registry",
    purpose: "entity-classification",
    sourceTypes: ["official-registry-record"],
    entityTypes: ["sole-proprietorship"],
    score: 0.82,
    reason: "A trade-name or similar official record can strongly support a sole-proprietorship classification but does not by itself create a separate legal entity.",
  },
  {
    id: "entity-classification.government-entity.registry",
    purpose: "entity-classification",
    sourceTypes: ["official-registry-record", "public-organic-record"],
    entityTypes: ["government-entity"],
    score: 0.92,
    reason: "An official governmental or organic record strongly supports government-entity classification.",
  },
  {
    id: "entity-classification.nonregistered.executed-contract",
    purpose: "entity-classification",
    sourceTypes: ["executed-contract"],
    entityTypes: ["nonregistered-organization"],
    score: 0.68,
    reason: "An executed contract can support the existence of a nonregistered organization but usually requires corroboration.",
  },
];

interface ClassificationGroup {
  readonly type: EntityClassification;
  readonly evaluations: readonly EvaluatedEntityClassificationSignal[];
  readonly score: number;
  readonly maxAuthority: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function signalConfidence(signal: EntityClassificationSignal): number {
  const value = signal.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function evaluateSignal(
  signal: EntityClassificationSignal,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedEntityClassificationSignal {
  const sourceAuthority = evaluateSourceAuthority({
    source: signal.source,
    context: {
      purpose: "entity-classification",
      entityType: signal.proposedType,
    },
    rules: [...ENTITY_CLASSIFICATION_RULES, ...(rules ?? [])],
  });

  const combinedScore = Math.round(
    clamp01(sourceAuthority.score * 0.85 + signalConfidence(signal) * 0.15) * 1000,
  ) / 1000;

  return { signal, sourceAuthority, combinedScore };
}

function groupSignals(
  evaluated: readonly EvaluatedEntityClassificationSignal[],
): ClassificationGroup[] {
  const map = new Map<EntityClassification, EvaluatedEntityClassificationSignal[]>();
  for (const item of evaluated) {
    const list = map.get(item.signal.proposedType) ?? [];
    list.push(item);
    map.set(item.signal.proposedType, list);
  }

  return [...map.entries()].map(([type, evaluations]) => {
    const sorted = [...evaluations].sort((a, b) => {
      if (b.sourceAuthority.score !== a.sourceAuthority.score) {
        return b.sourceAuthority.score - a.sourceAuthority.score;
      }
      return b.combinedScore - a.combinedScore;
    });
    const best = sorted[0]!;
    const corroboration = Math.min(0.04, Math.max(0, sorted.length - 1) * 0.01);
    return {
      type,
      evaluations: sorted,
      score: Math.round(clamp01(best.combinedScore + corroboration) * 1000) / 1000,
      maxAuthority: best.sourceAuthority.score,
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.maxAuthority !== a.maxAuthority) return b.maxAuthority - a.maxAuthority;
    return a.type.localeCompare(b.type);
  });
}

function ruleIds(evaluated: readonly EvaluatedEntityClassificationSignal[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolveEntityClassification(input: {
  signals: readonly EntityClassificationSignal[];
  rules?: readonly SourceAuthorityRule[];
  minimumResolutionScore?: number;
}): EntityClassificationResult {
  const evaluated = input.signals.map((signal) => evaluateSignal(signal, input.rules));
  const minimumResolutionScore = input.minimumResolutionScore ?? 0.75;

  if (evaluated.length === 0) {
    return {
      disposition: "insufficient-evidence",
      confidence: 0,
      evaluatedSignals: [],
      competingTypes: [],
      reasons: ["No classification signals were supplied."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const groups = groupSignals(evaluated);
  const top = groups[0]!;
  const competitors = groups.slice(1);
  const strongCompetitors = competitors.filter((group) => group.maxAuthority >= 0.75);
  const weakCompetitors = competitors.filter((group) => group.maxAuthority >= 0.4);

  if (top.type === "unknown" || top.maxAuthority < 0.5) {
    return {
      disposition: "insufficient-evidence",
      confidence: top.score,
      evaluatedSignals: evaluated,
      competingTypes: competitors.map((group) => group.type),
      reasons: ["The strongest classification evidence is insufficient to establish a useful entity type."],
      ruleIds: ruleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  if (top.maxAuthority >= 0.75 && strongCompetitors.length > 0) {
    return {
      disposition: "human-review-required",
      confidence: top.score,
      evaluatedSignals: evaluated,
      competingTypes: strongCompetitors.map((group) => group.type),
      reasons: ["Different entity classifications are supported by independently strong sources; automatic resolution is blocked."],
      ruleIds: ruleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  const topEvaluation = top.evaluations[0]!;
  if (top.score < minimumResolutionScore || topEvaluation.sourceAuthority.requiresHumanReview) {
    return {
      disposition: "human-review-required",
      confidence: top.score,
      evaluatedSignals: evaluated,
      competingTypes: competitors.map((group) => group.type),
      reasons: ["The leading classification does not satisfy the deterministic resolution threshold or its provenance requires review."],
      ruleIds: ruleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  return {
    disposition: weakCompetitors.length > 0 ? "resolved-with-conflict" : "resolved",
    authoritativeType: top.type,
    confidence: top.score,
    evaluatedSignals: evaluated,
    competingTypes: weakCompetitors.map((group) => group.type),
    reasons: [
      `Resolved as ${top.type} from the strongest purpose-specific source-authority cluster.`,
      ...(weakCompetitors.length > 0
        ? ["Lower-authority competing classifications remain visible in the audit trail."]
        : []),
    ],
    ruleIds: ruleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function entityClassificationToFinding(
  result: EntityClassificationResult,
): Finding {
  const entityIds = [...new Set(
    result.evaluatedSignals
      .map((item) => item.signal.entityId)
      .filter((value): value is string => Boolean(value)),
  )];

  return createFinding({
    findingType: "entity_classification",
    severity: result.requiresHumanReview ? "major" : "info",
    entityIds,
    explanation: [
      `Disposition: ${result.disposition}.`,
      result.authoritativeType
        ? `Entity classification: ${result.authoritativeType}.`
        : "No authoritative entity classification was established.",
      ...result.reasons,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Review the conflicting or insufficient classification evidence before relying on entity-specific rules."
      : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.entity-classification.v1",
      sourceRefs: result.evaluatedSignals.flatMap((item) => item.signal.source.sourceRefs ?? []),
    },
    confidence: result.confidence,
  });
}
