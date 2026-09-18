import type {
  JurisdictionRuleResult,
  RuleAuthorityReference,
} from "./types.js";

export type JurisdictionRuleFamily =
  | "ucc-debtor-name"
  | "ucc-governing-law"
  | "ucc-filing-location"
  | "ucc-attachment"
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
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function inForce(pack: JurisdictionRulePack, asOf: string): boolean {
  if (asOf < pack.effectiveFrom) return false;
  if (pack.effectiveTo && asOf > pack.effectiveTo) return false;
  return true;
}

function sameJurisdiction(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function uniqueAuthorities(packs: readonly JurisdictionRulePack[]): RuleAuthorityReference[] {
  const seen = new Set<string>();
  const result: RuleAuthorityReference[] = [];
  for (const pack of packs) {
    for (const authority of pack.authorityRefs) {
      const key = authority.id.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(authority);
    }
  }
  return result;
}

export function validateJurisdictionRulePack(pack: JurisdictionRulePack): string[] {
  const errors: string[] = [];
  if (!pack.id.trim()) errors.push("Rule pack id is required.");
  if (!pack.jurisdiction.trim()) errors.push("Rule pack jurisdiction is required.");
  if (!isoDate(pack.effectiveFrom)) errors.push("effectiveFrom must be a valid YYYY-MM-DD date.");
  if (pack.effectiveTo && !isoDate(pack.effectiveTo)) errors.push("effectiveTo must be a valid YYYY-MM-DD date.");
  if (pack.effectiveTo && isoDate(pack.effectiveFrom) && isoDate(pack.effectiveTo) && pack.effectiveTo < pack.effectiveFrom) {
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

  const packs = Object.freeze(
    inputPacks.map((pack) =>
      Object.freeze({
        ...pack,
        authorityRefs: Object.freeze(pack.authorityRefs.map((authority) => Object.freeze({ ...authority }))),
      }),
    ),
  );

  return Object.freeze({
    packs,
    resolve<T = unknown>(input: {
      family: JurisdictionRuleFamily;
      jurisdiction: string;
      asOf: string;
    }): JurisdictionRuleResult<T> {
      if (!input.jurisdiction.trim()) {
        return {
          status: "unresolved",
          jurisdiction: input.jurisdiction,
          authorityRefs: [],
          reasonCodes: ["missing-jurisdiction"],
          requiresHumanReview: true,
        };
      }

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
          sameJurisdiction(pack.jurisdiction, input.jurisdiction) &&
          inForce(pack, input.asOf),
      );

      if (candidates.length === 0) {
        return {
          status: "unsupported",
          jurisdiction: input.jurisdiction,
          authorityRefs: [],
          reasonCodes: ["no-active-supported-rule-pack"],
          requiresHumanReview: true,
        };
      }

      if (candidates.length > 1) {
        return {
          status: "unresolved",
          jurisdiction: input.jurisdiction,
          authorityRefs: uniqueAuthorities(candidates),
          reasonCodes: ["multiple-active-rule-packs"],
          requiresHumanReview: true,
        };
      }

      const rule = candidates[0]!;
      return {
        status: "resolved",
        jurisdiction: input.jurisdiction,
        value: rule.value as T,
        ruleId: rule.id,
        authorityRefs: rule.authorityRefs,
        reasonCodes: [],
        requiresHumanReview: false,
      };
    },
  });
}
