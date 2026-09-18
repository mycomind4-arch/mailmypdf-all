import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccLifecycleAction =
  | "amendment"
  | "continuation"
  | "assignment"
  | "termination";

export interface UccLifecycleRuleData {
  action: UccLifecycleAction;
  requiredFields: readonly string[];
  deadlineDescription?: string;
  notes?: readonly string[];
}

export function resolveUccLifecycleRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccLifecycleRuleData> {
  return input.registry.resolve<UccLifecycleRuleData>({
    family: "ucc-lifecycle",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
