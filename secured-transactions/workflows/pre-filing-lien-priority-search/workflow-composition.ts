import {
  buildUccDebtorSearchPlan,
  createUccSearchResult,
  summarizeUccSearchCoverage,
  type RawUccFilingRecord,
} from "@mailmypdf/registry-adapters";
import type {
  RegistryJurisdiction,
  RegistryProvenance,
  SearchStrategyPolicy,
} from "@mailmypdf/registry-adapters";

export interface PreFilingSearchInput {
  readonly jurisdiction: RegistryJurisdiction;
  readonly authoritativeDebtorName: string;
  readonly aliases?: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly allowedVariantKinds: SearchStrategyPolicy["allowedVariantKinds"];
  readonly maxVariants?: number;
}

export interface PreFilingSearchAssessment {
  readonly status: "ready-for-search" | "human-review-required" | "blocked";
  readonly plan: ReturnType<typeof buildUccDebtorSearchPlan>;
  readonly reasons: readonly string[];
  readonly requiresHumanReview: boolean;
}

export function composePreFilingSearch(input: PreFilingSearchInput): PreFilingSearchAssessment {
  const plan = buildUccDebtorSearchPlan(input);
  const reasons = [...plan.warnings];
  const requiresHumanReview = plan.warnings.length > 0;
  if (plan.steps.length === 0) reasons.push("No permitted search variants were produced.");
  return {
    status: plan.steps.length === 0 ? "blocked" : requiresHumanReview ? "human-review-required" : "ready-for-search",
    plan,
    reasons: [...new Set(reasons)],
    requiresHumanReview,
  };
}

export function assessPreFilingSearchResult(input: {
  readonly rawRecords: readonly RawUccFilingRecord[];
  readonly provenance: RegistryProvenance;
  readonly complete: boolean;
  readonly warnings?: readonly string[];
}) {
  const result = createUccSearchResult(input);
  const coverage = summarizeUccSearchCoverage(result);
  return {
    status: coverage.complete && coverage.resultCount > 0 ? "reviewable" as const : "human-review-required" as const,
    result,
    coverage,
    requiresHumanReview: !coverage.complete || coverage.resultCount === 0 || coverage.warnings.length > 0,
    consequentialActionAllowed: false as const,
  };
}
