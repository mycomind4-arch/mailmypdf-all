import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export interface UccDebtorNameRuleData {
  debtorType: string;
  controllingSourceDescription: string;
  requiredSourceKinds?: readonly string[];
  notes?: readonly string[];
}

export function resolveUccDebtorNameRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccDebtorNameRuleData> {
  return input.registry.resolve<UccDebtorNameRuleData>({
    family: "ucc-debtor-name",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
