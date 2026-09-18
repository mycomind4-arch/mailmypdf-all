import type { JurisdictionRuleRegistry } from "../../registry.js";
import type { JurisdictionRuleResult } from "../../types.js";

export type UccExceptionTarget =
  | "attachment"
  | "filing-location"
  | "perfection"
  | "priority"
  | "lifecycle";

export interface UccExceptionDefinition {
  readonly id: string;
  readonly target: UccExceptionTarget;
  readonly description: string;

  /**
   * Facts required to decide whether this exception applies.
   * These are identifiers only. The rule pack does not invent the facts.
   */
  readonly requiredFacts?: readonly string[];

  readonly notes?: readonly string[];
}

export interface UccExceptionRuleData {
  readonly exceptions: readonly UccExceptionDefinition[];
  readonly notes?: readonly string[];
}

export function resolveUccExceptionRule(input: {
  registry: JurisdictionRuleRegistry;
  jurisdiction: string;
  asOf: string;
}): JurisdictionRuleResult<UccExceptionRuleData> {
  return input.registry.resolve<UccExceptionRuleData>({
    family: "ucc-exception",
    jurisdiction: input.jurisdiction,
    asOf: input.asOf,
  });
}
