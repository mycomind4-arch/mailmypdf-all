import type {
  JurisdictionRuleResult,
  RuleAuthorityReference,
} from "./types.js";

export type JurisdictionRuleFamily =
  | "ucc-debtor-name"
  | "ucc-filing-location"
  | "ucc-perfection"
  | "ucc-priority"
  | "ucc-exception"
  | "ucc-lifecycle";

export interface JurisdictionRulePack<T = unknown> {
  id: string;
  family: JurisdictionRuleFamily;
  jurisdiction: string;
  status: "draft" | "active" | "retired";
  effectiveFrom: string;
  effectiveTo?: string;
  authorityRefs: readonly RuleAuthorityReference[];
  value: T;
}

export interface JurisdictionRuleRegistry {
  packs: readonly JurisdictionRulePack[];
  resolve<T = unknown>(input: {
    family: JurisdictionRuleFamily;
    jurisdiction: string;
    asOf: string;
  }): JurisdictionRuleResult<T>;
}

function isoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(parsed);
}

function inForce(pack: JurisdictionRulePack, asOf: string): boolean {
  if (asOf < pack.effectiveFrom) return false;
  if (pack.effectiveTo && asOf > pack.effectiveTo) return false;
  return true;
}

export function validateJurisdictionRulePack(pack: JurisdictionRulePack): string[] {
  const errors: string[] = [];
  if (!pack.id.trim()) errors.push("Rule pack id is required.");
  if (!pack.jurisdiction.trim()) errors.push("Rule pack jurisdiction is required.");
  if (!isoDate(pack.effectiveFrom)) errors.push("effectiveFrom must be YYYY-MM-DD.");
  if (pack.effectiveTo && !isoDate(pack.effectiveTo)) errors.push("effectiveTo must be YYYY-MM-DD.");
  if (pack.effectiveTo && pack.effectiveTo < pack.effectiveFrom) {
    errors.push("effectiveTo cannot precede effectiveFrom.");
  }
  if (pack.status === "active" && pack.authorityRefs.length === 0) {
    errors.push("An active rule pack requires at least one authority reference.");
  }
  for (const authority of pack.authorityRefs) {
    if (!authority.id.trim() || !authority.title.trim()) {
      errors.push("Authority references require stable id and title.");
    }
  }
  return errors;
}

export function createJurisdictionRuleRegistry(
  inputPacks: readonly JurisdictionRulePack[],
): JurisdictionRuleRegistry {
  const ids = new Set<string>();
  for (const pack of inputPacks) {
    const errors = validateJurisdictionRulePack(pack);
    if (errors.length) {
      throw new Error(`Invalid jurisdiction rule pack ${pack.id || "<unnamed>"}: ${errors.join(" ")}`);
    }
    if (ids.has(pack.id)) throw new Error(`Duplicate jurisdiction rule pack id: ${pack.id}`);
    ids.add(pack.id);
  }

  const packs = Object.freeze(inputPacks.map((pack) => Object.freeze({ ...pack })));

  return Object.freeze({
    packs,
    resolve<T = unknown>(input: {
      family: JurisdictionRuleFamily;
      jurisdiction: string;
      asOf: string;
    }): JurisdictionRuleResult<T> {
      if (!isoDate(input.asOf)) {
        return {
          status: "unresolved",
          jurisdiction: input.jurisdiction,
          authorityRefs: [],
          reasonCodes: ["invalid-as-of-date"],
          requiresHumanReview: true,
        };
      }

      const candidates = packs.filter(
        (pack) =>
          pack.status === "active" &&
          pack.family === input.family &&