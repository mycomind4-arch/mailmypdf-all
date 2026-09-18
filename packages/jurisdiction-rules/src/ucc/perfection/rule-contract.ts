import type {
  JurisdictionRuleRegistry,
} from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccPerfectionMethod =
  | "filing"
  | "possession"
  | "control"
  | "certificate-of-title"
  | "automatic"
  | "other";

export interface UccPerfectionRuleData {
  collateralClass: string;
  allowedMethods: readonly UccPerfectionMethod[];
  requiredConditions?: readonly string[];
  notes?: readonly string[];
}

export function resolveUccPerfectionRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccPerfectionRuleData> {
  return input.registry.resolve<UccPerfectionRuleData>({
    family: "ucc-perfection",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
