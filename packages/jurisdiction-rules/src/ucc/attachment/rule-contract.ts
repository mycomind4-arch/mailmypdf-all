import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

/**
 * Jurisdiction-specific attachment conditions.
 *
 * Condition identifiers are deliberately data-driven. The engine must not
 * hard-code substantive attachment law. Authority-backed rule packs define
 * which conditions must be established.
 */
export interface UccAttachmentRuleData {
  readonly ruleDescription: string;
  readonly requiredConditions: readonly string[];
  readonly notes?: readonly string[];
}

export function resolveUccAttachmentRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccAttachmentRuleData> {
  return input.registry.resolve<UccAttachmentRuleData>({
    family: "ucc-attachment",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
