import {
  compareNormalizedNames,
  normalizeName,
  type NameComparison,
  type NormalizedName,
} from "@mailmypdf/identity-capacity";

/**
 * Workflow-owned adapter around the shared deterministic name engine.
 *
 * This compares name forms only. The result must not be promoted into a legal
 * identity conclusion without the separate authoritative-name/capacity stages.
 */
export function normalizeWorkflowName(raw: string): NormalizedName {
  return normalizeName(raw);
}

export function compareWorkflowNameForms(left: string, right: string): NameComparison {
  return compareNormalizedNames(left, right);
}
