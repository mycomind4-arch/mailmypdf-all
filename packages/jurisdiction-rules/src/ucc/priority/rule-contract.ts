import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export interface UccPriorityRuleData {
  ruleDescription: string;
  requiredRecordFields: readonly string[];
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
