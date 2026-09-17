import { createFinding, type Finding } from "@mailmypdf/intelligence";
import type { Capacity } from "./capacity-resolution.js";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type AuthorizationEffect = "grant" | "restrict" | "revoke";

export type AuthorityToActDisposition =
  | "authorized"
  | "not-authorized"
  | "human-review-required"
  | "insufficient-evidence";

export interface AuthorityAction {
  readonly type: string;
  readonly description?: string | undefined;
  readonly principalEntityId: string;
}

export interface AuthorizationEvidence {
  readonly id: string;
  readonly actorId: string;
  readonly principalEntityId: string;
  readonly capacity?: Capacity | undefined;
  readonly actionTypes: readonly string[];
  readonly effect: AuthorizationEffect;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedAuthorizationEvidence {
  readonly evidence: AuthorizationEvidence;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
}

export interface AuthorityToActResult {
  readonly actorId: string;
  readonly capacity?: Capacity | undefined;
  readonly action: AuthorityAction;
  readonly disposition: AuthorityToActDisposition;
  readonly confidence: number;
  readonly supportingEvidenceIds: readonly string[];
  readonly restrictingEvidenceIds: readonly string[];
  readonly evaluatedEvidence: readonly EvaluatedAuthorizationEvidence[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const AUTHORITY_TO_ACT_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "authority.court-order",
    purpose: "authority-to-act",
    sourceTypes: ["court-order"],
    score: 0.97,
    reason: "A court order is strong authority evidence within the order's actual scope and effective period.",
  },
  {
    id: "authority.governing-document",
    purpose: "authority-to-act",
    sourceTypes: ["organizational-document"],
    score: 0.92,
    reason: "A governing organizational or trust document is strong authority evidence when it covers the actor, principal, and act.",
  },
  {
    id: "authority.executed-contract",
    purpose: "authority-to-act",
    sourceTypes: ["executed-contract"],
    score: 0.88,
    reason: "An executed agreement can strongly grant, limit, or revoke authority within its contractual scope.",
  },
  {
    id: "authority.public-organic-record",
    purpose: "authority-to-act",
    sourceTypes: ["public-organic-record"],
    score: 0.8,
    reason: "A public organic record can support authority where the governing law or record makes the stated role relevant to the act.",
  },
  {
    id: "authority.official-registry",
    purpose: "authority-to-act",
    sourceTypes: ["official-registry-record"],
    score: 0.75,
    reason: "An official registry can support role-based authority, but a listed role does not automatically authorize every act.",
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function evidenceConfidence(evidence: AuthorizationEvidence): number {
  const value = evidence.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function actionMatches(evidence: AuthorizationEvidence, actionType: string): boolean {
  return evidence.actionTypes.includes("*") || evidence.actionTypes.includes(actionType);
}

function evaluateEvidence(
  evidence: AuthorizationEvidence,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedAuthorizationEvidence {
  const sourceAuthority = evaluateSourceAuthority({
    source: evidence.source,
    context: {
      purpose: "authority-to-act",
      entityType: evidence.capacity,
    },
    rules: [...AUTHORITY_TO_ACT_RULES, ...(rules ?? [])],
  });

  return {
    evidence,
    sourceAuthority,
    combinedScore: Math.round(
      clamp01(sourceAuthority.score * 0.9 + evidenceConfidence(evidence) * 0.1) * 1000,
    ) / 1000,
  };
}

function collectRuleIds(evaluated: readonly EvaluatedAuthorizationEvidence[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolveAuthorityToAct(input: {
  actorId: string;
  capacity?: Capacity;
  action: AuthorityAction;
  evidence: readonly AuthorizationEvidence[];
  rules?: readonly SourceAuthorityRule[];
  strongEvidenceThreshold?: number;
}): AuthorityToActResult {
  const applicable = input.evidence.filter((evidence) =>
    evidence.actorId === input.actorId &&
    evidence.principalEntityId === input.action.principalEntityId &&
    actionMatches(evidence, input.action.type) &&
    (!input.capacity || !evidence.capacity || evidence.capacity === input.capacity),
  );
  const evaluated = applicable
    .map((evidence) => evaluateEvidence(evidence, input.rules))
    .sort((a, b) => b.combinedScore - a.combinedScore);

  const threshold = input.strongEvidenceThreshold ?? 0.75;
  const strong = evaluated.filter((item) =>
    item.combinedScore >= threshold &&
    !item.sourceAuthority.requiresHumanReview,
  );
  const grants = strong.filter((item) => item.evidence.effect === "grant");
  const negatives = strong.filter((item) =>
    item.evidence.effect === "restrict" || item.evidence.effect === "revoke",
  );

  const base = {
    actorId: input.actorId,
    capacity: input.capacity,
    action: input.action,
    evaluatedEvidence: evaluated,
    ruleIds: collectRuleIds(evaluated),
  };

  if (evaluated.length === 0) {
    return {
      ...base,
      disposition: "insufficient-evidence",
      confidence: 0,
      supportingEvidenceIds: [],
      restrictingEvidenceIds: [],
      reasons: ["No authority evidence applies to this actor, principal, capacity, and action."],
      requiresHumanReview: false,
    };
  }

  if (grants.length > 0 && negatives.length > 0) {
    return {
      ...base,
      disposition: "human-review-required",
      confidence: Math.max(grants[0]!.combinedScore, negatives[0]!.combinedScore),
      supportingEvidenceIds: grants.map((item) => item.evidence.id),
      restrictingEvidenceIds: negatives.map((item) => item.evidence.id),
      reasons: ["Strong evidence both grants and restricts or revokes the requested authority; chronology, scope, or supersession must be reviewed."],
      requiresHumanReview: true,
    };
  }

  if (negatives.length > 0) {
    return {
      ...base,
      disposition: "not-authorized",
      confidence: negatives[0]!.combinedScore,
      supportingEvidenceIds: [],
      restrictingEvidenceIds: negatives.map((item) => item.evidence.id),
      reasons: ["Strong applicable evidence restricts or revokes authority for this action."],
      requiresHumanReview: false,
    };
  }

  if (grants.length > 0) {
    return {
      ...base,
      disposition: "authorized",
      confidence: grants[0]!.combinedScore,
      supportingEvidenceIds: grants.map((item) => item.evidence.id),
      restrictingEvidenceIds: [],
      reasons: ["Strong applicable evidence grants authority for this actor, principal, and action context."],
      requiresHumanReview: false,
    };
  }

  const top = evaluated[0]!;
  const review = top.combinedScore >= 0.5 || top.sourceAuthority.requiresHumanReview;
  return {
    ...base,
    disposition: review ? "human-review-required" : "insufficient-evidence",
    confidence: top.combinedScore,
    supportingEvidenceIds: evaluated
      .filter((item) => item.evidence.effect === "grant")
      .map((item) => item.evidence.id),
    restrictingEvidenceIds: evaluated
      .filter((item) => item.evidence.effect !== "grant")
      .map((item) => item.evidence.id),
    reasons: review
      ? ["Relevant authority evidence exists but does not satisfy the deterministic authority threshold or requires human verification."]
      : ["Available authority evidence is too weak to support an authority determination."],
    requiresHumanReview: review,
  };
}

export function authorityToActToFinding(result: AuthorityToActResult): Finding {
  return createFinding({
    findingType: "authority_to_act",
    severity:
      result.disposition === "not-authorized" || result.requiresHumanReview
        ? "major"
        : "info",
    entityIds: [result.actorId, result.action.principalEntityId],
    explanation: [
      `Action: ${result.action.type}.`,
      `Disposition: ${result.disposition}.`,
      ...result.reasons,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve conflicting, weak, or superseded authority evidence before the actor takes or authorizes the consequential action."
      : result.disposition === "not-authorized"
        ? "Do not rely on the claimed authority unless a later valid grant or other controlling authority is established."
        : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.authority-to-act.v1",
      sourceRefs: result.evaluatedEvidence.flatMap((item) => item.evidence.source.sourceRefs ?? []),
    },
    confidence: result.confidence,
  });
}
