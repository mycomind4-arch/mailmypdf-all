import {
  createJurisdictionRuleRegistry,
  type JurisdictionRuleRegistry,
} from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export interface UccFilingLocationRuleData {
  debtorType: string;
  locationBasis: string;
  filingOfficeId: string;
  filingOfficeLabel: string;
  notes?: readonly string[];
}

export function resolveUccFilingLocationRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccFilingLocationRuleData> {
  return input.registry.resolve<UccFilingLocationRuleData>({
    family: "ucc-filing-location",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}

export function createEmptyUccFilingLocationRegistry(): JurisdictionRuleRegistry {
  return createJurisdictionRuleRegistry([]);
}
