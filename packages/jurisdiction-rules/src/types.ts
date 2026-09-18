export type JurisdictionCoverageStatus = "supported" | "partial" | "unsupported" | "requires-review";

export interface RuleAuthorityReference {
  id: string;
  title: string;
  citation?: string;
  sourceUri?: string;
  jurisdiction: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface JurisdictionRuleResult<T = unknown> {
  status: "resolved" | "conditional" | "unresolved" | "unsupported";
  jurisdiction: string;
  value?: T;
  ruleId?: string;
  authorityRefs: readonly RuleAuthorityReference[];
  reasonCodes: readonly string[];
  requiresHumanReview: boolean;
}
