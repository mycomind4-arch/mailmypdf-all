import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccPriorityComparisonValueType =
  | "date"
  | "number"
  | "string";

export type UccPriorityComparisonDirection =
  | "ascending"
  | "descending";

/**
 * Priority comparison is deliberately defined by authority-backed rule data.
 *
 * Example:
 *
 * {
 *   field: "eventDate",
 *   valueType: "date",
 *   direction: "ascending"
 * }
 *
 * means the rule pack instructs the analysis engine to compare that field
 * chronologically. The engine itself contains no rule saying that earlier
 * filing automatically wins.
 */
export interface UccPriorityComparisonStep {
  readonly field: string;
  readonly valueType: UccPriorityComparisonValueType;
  readonly direction: UccPriorityComparisonDirection;
}

export interface UccPriorityRuleData {
  ruleDescription: string;
  requiredRecordFields: readonly string[];

  /**
   * Optional deterministic comparison supplied by the authority-backed rule
   * pack. Existing packs without comparisonSteps remain valid but cannot
   * produce an automated priority comparison.
   */
  comparisonSteps?: readonly UccPriorityComparisonStep[];

  specialConditions?: readonly string[];
  notes?: readonly string[];
}

export function resolveUccPriorityRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccPriorityRuleData> {
  return input.registry.resolve<UccPriorityRuleData>({
    family: "ucc-priority",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
