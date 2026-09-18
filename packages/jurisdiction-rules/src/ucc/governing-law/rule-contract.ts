import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

/**
 * Authority-backed rule data describing which jurisdiction's law governs
 * the requested secured-transaction issue.
 *
 * This structure contains DATA from a reviewed rule pack. The resolver itself
 * does not embed legal doctrine.
 */
export interface UccGoverningLawRuleData {
  readonly governingLawJurisdiction: string;
  readonly ruleDescription: string;
  readonly requiredFacts: readonly string[];
  readonly notes?: readonly string[];
}

export function resolveUccGoverningLawRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccGoverningLawRuleData> {
  return input.registry.resolve<UccGoverningLawRuleData>({
    family: "ucc-governing-law",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
