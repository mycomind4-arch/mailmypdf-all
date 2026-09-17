import { createFinding, type Finding } from "@mailmypdf/intelligence";
import {
  evaluateSourceAuthority,
  type AuthoritySource,
  type SourceAuthorityEvaluation,
  type SourceAuthorityRule,
} from "./source-authority.js";

export type ObligationTermField =
  | "creditor-entity-id"
  | "obligor-entity-id"
  | "obligation-type"
  | "principal-amount"
  | "currency"
  | "due-date"
  | "status"
  | "description"
  | "security-asset-id"
  | "condition"
  | "governing-law"
  | "instrument-id";

export type ObligationTermValue = string | number | boolean | null;
export type ObligationTermEffect = "supports" | "contradicts";

export type ObligationResolutionDisposition =
  | "resolved"
  | "resolved-with-gaps"
  | "human-review-required"
  | "insufficient-evidence";

export interface ObligationTermClaim {
  readonly id: string;
  readonly obligationId: string;
  readonly field: ObligationTermField;
  readonly value: ObligationTermValue;
  readonly effect: ObligationTermEffect;
  readonly source: AuthoritySource;
  readonly confidence?: number | undefined;
  readonly effectiveAt?: string | undefined;
  readonly reason?: string | undefined;
}

export interface EvaluatedObligationTermClaim {
  readonly claim: ObligationTermClaim;
  readonly sourceAuthority: SourceAuthorityEvaluation;
  readonly combinedScore: number;
  readonly issues: readonly string[];
}

export interface ResolvedObligationTerm {
  readonly field: ObligationTermField;
  readonly value: ObligationTermValue;
  readonly confidence: number;
  readonly supportingClaimIds: readonly string[];
  readonly contradictingClaimIds: readonly string[];
}

export interface ObligationResolutionResult {
  readonly obligationId: string;
  readonly disposition: ObligationResolutionDisposition;
  readonly terms: readonly ResolvedObligationTerm[];
  readonly evaluatedClaims: readonly EvaluatedObligationTermClaim[];
  readonly missingRequiredFields: readonly ObligationTermField[];
  readonly conflicts: readonly string[];
  readonly reasons: readonly string[];
  readonly ruleIds: readonly string[];
  readonly requiresHumanReview: boolean;
}

export const OBLIGATION_RESOLUTION_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "obligation.court-order",
    purpose: "obligation-resolution",
    sourceTypes: ["court-order"],
    score: 0.98,
    reason: "A court order is strong evidence of the obligation terms actually determined or ordered by the court, subject to later modification or appeal.",
  },
  {
    id: "obligation.executed-contract",
    purpose: "obligation-resolution",
    sourceTypes: ["executed-contract"],
    score: 0.95,
    reason: "An executed agreement is strong evidence of the obligation terms expressed in that agreement.",
  },
  {
    id: "obligation.agency-notice",
    purpose: "obligation-resolution",
    sourceTypes: ["agency-notice"],
    score: 0.85,
    reason: "An agency notice is strong evidence of the obligation or demand asserted by that agency, but does not by itself establish that the assertion is legally correct.",
  },
  {
    id: "obligation.invoice.amount",
    purpose: "obligation-resolution",
    sourceTypes: ["invoice"],
    entityTypes: ["principal-amount", "currency", "due-date", "description"],
    score: 0.75,
    reason: "An invoice can strongly evidence the amount, currency, due date, or description claimed by the issuer, while remaining subject to contract terms and dispute.",
  },
  {
    id: "obligation.bank-record.status",
    purpose: "obligation-resolution",
    sourceTypes: ["bank-record"],
    entityTypes: ["status", "principal-amount"],
    score: 0.78,
    reason: "A bank record can strongly evidence a payment transaction or balance-related fact but must be interpreted in the context of the underlying obligation.",
  },
  {
    id: "obligation.tax-record",
    purpose: "obligation-resolution",
    sourceTypes: ["tax-record"],
    entityTypes: ["principal-amount", "status", "due-date"],
    score: 0.82,
    reason: "An official tax record can strongly evidence amounts and status recorded by the taxing authority, subject to corrections, appeals, and timing.",
  },
  {
    id: "obligation.organizational-document",
    purpose: "obligation-resolution",
    sourceTypes: ["organizational-document"],
    entityTypes: ["condition", "governing-law", "description"],
    score: 0.78,
    reason: "A governing organizational document can strongly support internal conditions or governing terms relevant to an obligation.",
  },
];

const MULTI_VALUE_FIELDS = new Set<ObligationTermField>([
  "creditor-entity-id",
  "obligor-entity-id",
  "security-asset-id",
  "condition",
  "instrument-id",
]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function claimConfidence(claim: ObligationTermClaim): number {
  const value = claim.confidence ?? 0.7;
  return clamp01(Number.isFinite(value) ? value : 0.7);
}

function canonicalValue(value: ObligationTermValue): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "number:invalid";
    return `number:${value}`;
  }
  if (typeof value === "boolean") return `boolean:${value}`;
  return `string:${value.trim().toLowerCase()}`;
}

function validateClaim(claim: ObligationTermClaim): string[] {
  const issues: string[] = [];
  if (claim.value === null) {
    issues.push("Null is not a usable resolved obligation term value.");
  }
  if (typeof claim.value === "number" && !Number.isFinite(claim.value)) {
    issues.push("Numeric obligation term values must be finite.");
  }
  if (typeof claim.value === "string" && !claim.value.trim()) {
    issues.push("String obligation term values must not be empty.");
  }
  if (claim.field === "principal-amount" && typeof claim.value === "number" && claim.value < 0) {
    issues.push("Principal amount cannot be negative; credits or offsets should be represented separately.");
  }
  return issues;
}

function evaluateClaim(
  claim: ObligationTermClaim,
  rules?: readonly SourceAuthorityRule[],
): EvaluatedObligationTermClaim {
  const sourceAuthority = evaluateSourceAuthority({
    source: claim.source,
    context: {
      purpose: "obligation-resolution",
      entityType: claim.field,
    },
    rules: [...OBLIGATION_RESOLUTION_RULES, ...(rules ?? [])],
  });

  const issues = validateClaim(claim);
  let combinedScore = clamp01(
    sourceAuthority.score * 0.88 + claimConfidence(claim) * 0.12,
  );
  if (issues.length > 0) combinedScore = Math.min(combinedScore, 0.49);

  return {
    claim,
    sourceAuthority,
    combinedScore: Math.round(combinedScore * 1000) / 1000,
    issues,
  };
}

interface ValueGroup {
  readonly field: ObligationTermField;
  readonly value: ObligationTermValue;
  readonly supports: readonly EvaluatedObligationTermClaim[];
  readonly contradicts: readonly EvaluatedObligationTermClaim[];
  readonly strongestSupport: number;
  readonly strongestContradiction: number;
}

function groupClaims(evaluated: readonly EvaluatedObligationTermClaim[]): ValueGroup[] {
  const map = new Map<string, EvaluatedObligationTermClaim[]>();
  for (const item of evaluated) {
    const key = `${item.claim.field}|${canonicalValue(item.claim.value)}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.values()].map((items) => {
    const supports = items
      .filter((item) => item.claim.effect === "supports")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const contradicts = items
      .filter((item) => item.claim.effect === "contradicts")
      .sort((a, b) => b.combinedScore - a.combinedScore);
    const first = items[0]!;
    return {
      field: first.claim.field,
      value: first.claim.value,
      supports,
      contradicts,
      strongestSupport: supports[0]?.combinedScore ?? 0,
      strongestContradiction: contradicts[0]?.combinedScore ?? 0,
    };
  });
}

function toResolved(group: ValueGroup): ResolvedObligationTerm {
  return {
    field: group.field,
    value: group.value,
    confidence: group.strongestSupport,
    supportingClaimIds: group.supports.map((item) => item.claim.id),
    contradictingClaimIds: group.contradicts.map((item) => item.claim.id),
  };
}

function collectRuleIds(evaluated: readonly EvaluatedObligationTermClaim[]): string[] {
  return [...new Set(
    evaluated
      .map((item) => item.sourceAuthority.matchedRuleId)
      .filter((value): value is string => Boolean(value)),
  )];
}

export function resolveObligation(input: {
  obligationId: string;
  claims: readonly ObligationTermClaim[];
  requiredFields?: readonly ObligationTermField[];
  rules?: readonly SourceAuthorityRule[];
  strongEvidenceThreshold?: number;
}): ObligationResolutionResult {
  const threshold = input.strongEvidenceThreshold ?? 0.75;
  const evaluated = input.claims
    .filter((claim) => claim.obligationId === input.obligationId)
    .map((claim) => evaluateClaim(claim, input.rules));

  if (evaluated.length === 0) {
    return {
      obligationId: input.obligationId,
      disposition: "insufficient-evidence",
      terms: [],
      evaluatedClaims: [],
      missingRequiredFields: [...(input.requiredFields ?? [])],
      conflicts: [],
      reasons: ["No obligation-term evidence was supplied for this obligation."],
      ruleIds: [],
      requiresHumanReview: false,
    };
  }

  const groups = groupClaims(evaluated);
  const conflicts: string[] = [];
  const supported: ValueGroup[] = [];

  for (const group of groups) {
    if (group.strongestSupport >= threshold && group.strongestContradiction >= threshold) {
      conflicts.push(
        `Strong evidence both supports and contradicts ${group.field}=${String(group.value)}.`,
      );
      continue;
    }
    if (group.strongestSupport >= threshold) supported.push(group);
  }

  for (const field of [...new Set(supported.map((group) => group.field))]) {
    if (MULTI_VALUE_FIELDS.has(field)) continue;
    const values = supported.filter((group) => group.field === field);
    if (values.length > 1) {
      conflicts.push(
        `The single-value obligation field ${field} has more than one strongly supported value.`,
      );
    }
  }

  if (evaluated.some((item) => item.issues.length > 0)) {
    conflicts.push("One or more obligation claims contain invalid term values.");
  }

  const terms = supported.map(toResolved);
  const resolvedFields = new Set(terms.map((term) => term.field));
  const missingRequiredFields = (input.requiredFields ?? []).filter(
    (field) => !resolvedFields.has(field),
  );

  if (conflicts.length > 0) {
    return {
      obligationId: input.obligationId,
      disposition: "human-review-required",
      terms,
      evaluatedClaims: evaluated,
      missingRequiredFields,
      conflicts,
      reasons: ["Conflicting consequential obligation terms cannot be resolved safely by source ranking alone."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: true,
    };
  }

  if (terms.length === 0) {
    const top = [...evaluated].sort((a, b) => b.combinedScore - a.combinedScore)[0]!;
    const review = top.combinedScore >= 0.5 || top.sourceAuthority.requiresHumanReview;
    return {
      obligationId: input.obligationId,
      disposition: review ? "human-review-required" : "insufficient-evidence",
      terms: [],
      evaluatedClaims: evaluated,
      missingRequiredFields,
      conflicts: [],
      reasons: review
        ? ["Relevant obligation evidence exists but does not satisfy the deterministic resolution threshold."]
        : ["Available obligation evidence is too weak to support resolved terms."],
      ruleIds: collectRuleIds(evaluated),
      requiresHumanReview: review,
    };
  }

  return {
    obligationId: input.obligationId,
    disposition: missingRequiredFields.length > 0 ? "resolved-with-gaps" : "resolved",
    terms,
    evaluatedClaims: evaluated,
    missingRequiredFields,
    conflicts: [],
    reasons: [
      "Resolved only terms supported by strong purpose-specific evidence.",
      "This result reconstructs the evidenced obligation record; it does not independently determine enforceability.",
      ...(missingRequiredFields.length > 0
        ? [`Required fields remain unresolved: ${missingRequiredFields.join(", ")}.`]
        : []),
    ],
    ruleIds: collectRuleIds(evaluated),
    requiresHumanReview: false,
  };
}

export function obligationResolutionToFinding(
  result: ObligationResolutionResult,
): Finding {
  const entityIds = result.terms
    .filter((term) =>
      term.field === "creditor-entity-id" || term.field === "obligor-entity-id",
    )
    .map((term) => term.value)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return createFinding({
    findingType: "obligation_resolution",
    severity: result.requiresHumanReview ? "major" : result.missingRequiredFields.length > 0 ? "minor" : "info",
    entityIds: [...new Set(entityIds)],
    explanation: [
      `Obligation: ${result.obligationId}.`,
      `Disposition: ${result.disposition}.`,
      `Resolved terms: ${result.terms.map((term) => `${term.field}=${String(term.value)}`).join(", ") || "none"}.`,
      ...result.reasons,
      ...result.conflicts,
    ].join(" "),
    recommendedAction: result.requiresHumanReview
      ? "Resolve conflicting obligation terms before relying on this record for a consequential decision."
      : result.missingRequiredFields.length > 0
        ? "Obtain evidence for the unresolved required obligation terms."
        : undefined,
    provenance: {
      level: "rule_derived",
      ruleId: "identity-capacity.obligation-resolution.v1",
      sourceRefs: result.evaluatedClaims.flatMap((item) => item.claim.source.sourceRefs ?? []),
    },
    confidence: result.terms.length > 0
      ? Math.max(...result.terms.map((term) => term.confidence))
      : 0,
  });
}
