import type { ProvenanceLevel, SourceRef } from "@mailmypdf/intelligence";

export type SourceAuthorityTier =
  | "authoritative"
  | "strong"
  | "supporting"
  | "weak"
  | "unusable";

export type SourceType =
  | "public-organic-record"
  | "official-registry-record"
  | "government-issued-id"
  | "recorded-title"
  | "court-order"
  | "organizational-document"
  | "executed-contract"
  | "tax-record"
  | "bank-record"
  | "agency-notice"
  | "correspondence"
  | "invoice"
  | "website"
  | "user-statement"
  | "ai-inference"
  | "other";

export interface AuthoritySource {
  readonly id: string;
  readonly sourceType: SourceType;
  readonly provenanceLevel: ProvenanceLevel;
  readonly issuer?: string | undefined;
  readonly jurisdiction?: string | undefined;
  readonly effectiveAt?: string | undefined;
  readonly sourceRefs?: readonly SourceRef[] | undefined;
}

export interface SourceAuthorityContext {
  readonly purpose: string;
  readonly jurisdiction?: string | undefined;
  readonly entityType?: string | undefined;
  readonly asOf?: string | undefined;
}

export interface SourceAuthorityRule {
  readonly id: string;
  readonly purpose: string;
  readonly sourceTypes: readonly SourceType[];
  readonly score: number;
  readonly jurisdictions?: readonly string[] | undefined;
  readonly entityTypes?: readonly string[] | undefined;
  readonly reason: string;
}

export interface SourceAuthorityEvaluation {
  readonly sourceId: string;
  readonly score: number;
  readonly tier: SourceAuthorityTier;
  readonly matchedRuleId?: string | undefined;
  readonly reasons: readonly string[];
  readonly requiresHumanReview: boolean;
}

const BASE_SCORE: Readonly<Record<SourceType, number>> = {
  "public-organic-record": 0.88,
  "official-registry-record": 0.88,
  "government-issued-id": 0.82,
  "recorded-title": 0.9,
  "court-order": 0.9,
  "organizational-document": 0.75,
  "executed-contract": 0.65,
  "tax-record": 0.7,
  "bank-record": 0.55,
  "agency-notice": 0.6,
  "correspondence": 0.4,
  "invoice": 0.4,
  "website": 0.25,
  "user-statement": 0.25,
  "ai-inference": 0.1,
  "other": 0.2,
};

export const DEFAULT_SOURCE_AUTHORITY_RULES: readonly SourceAuthorityRule[] = [
  {
    id: "registered-organization.public-organic-record",
    purpose: "registered-organization-name",
    sourceTypes: ["public-organic-record"],
    score: 1,
    reason: "A public organic record is controlling evidence for the registered organization's legal name when applicable.",
  },
  {
    id: "registered-organization.official-registry",
    purpose: "registered-organization-name",
    sourceTypes: ["official-registry-record"],
    score: 0.98,
    reason: "An official organizational registry is high-authority evidence for the registered organization's legal name.",
  },
  {
    id: "registered-organization.organizational-document",
    purpose: "registered-organization-name",
    sourceTypes: ["organizational-document"],
    score: 0.8,
    reason: "Organizational documents are strong supporting evidence but may be superseded by current public records.",
  },
  {
    id: "property-owner.recorded-title",
    purpose: "property-owner",
    sourceTypes: ["recorded-title"],
    score: 1,
    reason: "Recorded title is high-authority evidence for recorded ownership for this purpose.",
  },
  {
    id: "property-owner.court-order",
    purpose: "property-owner",
    sourceTypes: ["court-order"],
    score: 0.92,
    reason: "A court order can strongly affect ownership conclusions depending on scope and current status.",
  },
  {
    id: "identity-review.government-id",
    purpose: "identity-review",
    sourceTypes: ["government-issued-id"],
    score: 0.95,
    reason: "Government-issued identification is strong evidence for an individual's recorded identity details.",
  },
  {
    id: "court-party.court-order",
    purpose: "court-party",
    sourceTypes: ["court-order"],
    score: 0.95,
    reason: "Court records are strong evidence for the name used for a court-party purpose.",
  },
  {
    id: "government-correspondence.agency-notice",
    purpose: "government-correspondence",
    sourceTypes: ["agency-notice"],
    score: 0.85,
    reason: "An agency notice is strong evidence for the addressee/name used in that agency matter.",
  },
  {
    id: "mailing-recipient.agency-notice",
    purpose: "mailing-recipient",
    sourceTypes: ["agency-notice"],
    score: 0.8,
    reason: "An agency notice is strong evidence for the intended recipient in that matter.",
  },
];

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function tierFor(score: number): SourceAuthorityTier {
  if (score >= 0.9) return "authoritative";
  if (score >= 0.75) return "strong";
  if (score >= 0.5) return "supporting";
  if (score >= 0.25) return "weak";
  return "unusable";
}

function ruleMatches(
  rule: SourceAuthorityRule,
  source: AuthoritySource,
  context: SourceAuthorityContext,
): boolean {
  if (rule.purpose !== context.purpose) return false;
  if (!rule.sourceTypes.includes(source.sourceType)) return false;
  if (
    rule.jurisdictions &&
    context.jurisdiction &&
    !rule.jurisdictions.includes(context.jurisdiction)
  ) return false;
  if (
    rule.entityTypes &&
    context.entityType &&
    !rule.entityTypes.includes(context.entityType)
  ) return false;
  return true;
}

function bestRule(
  rules: readonly SourceAuthorityRule[],
  source: AuthoritySource,
  context: SourceAuthorityContext,
): SourceAuthorityRule | undefined {
  return rules
    .filter((rule) => ruleMatches(rule, source, context))
    .sort((a, b) => b.score - a.score)[0];
}

export function evaluateSourceAuthority(input: {
  source: AuthoritySource;
  context: SourceAuthorityContext;
  rules?: readonly SourceAuthorityRule[];
}): SourceAuthorityEvaluation {
  const rules = [...DEFAULT_SOURCE_AUTHORITY_RULES, ...(input.rules ?? [])];
  const matched = bestRule(rules, input.source, input.context);
  const reasons: string[] = [];

  let score = matched?.score ?? BASE_SCORE[input.source.sourceType];
  if (matched) reasons.push(matched.reason);
  else reasons.push("No purpose-specific rule matched; using the generic source-type authority baseline.");

  if (
    input.context.jurisdiction &&
    input.source.jurisdiction &&
    input.context.jurisdiction !== input.source.jurisdiction
  ) {
    score -= 0.15;
    reasons.push("The source jurisdiction differs from the requested context jurisdiction.");
  }

  switch (input.source.provenanceLevel) {
    case "human_verified":
      score += 0.05;
      reasons.push("Human verification increases confidence in source attribution, not the legal authority of the source itself.");
      break;
    case "ai_inferred":
      score = Math.min(score, 0.35);
      reasons.push("AI-inferred provenance is capped and cannot independently become authoritative.");
      break;
    case "user_provided":
      score = Math.min(score, 0.6);
      reasons.push("Unverified user-provided provenance is capped pending corroboration.");
      break;
    case "rule_derived":
      score = Math.min(score, 0.8);
      reasons.push("Rule-derived information is capped because the underlying source must remain reviewable.");
      break;
    case "document_extracted":
    case "external_source":
      break;
  }

  if (input.source.sourceType === "ai-inference") {
    score = Math.min(score, 0.25);
    reasons.push("An AI inference is not an authoritative source.");
  }

  score = Math.round(clamp(score) * 1000) / 1000;
  const tier = tierFor(score);

  return {
    sourceId: input.source.id,
    score,
    tier,
    matchedRuleId: matched?.id,
    reasons,
    requiresHumanReview:
      input.source.provenanceLevel === "ai_inferred" ||
      input.source.sourceType === "ai-inference" ||
      tier === "unusable",
  };
}
