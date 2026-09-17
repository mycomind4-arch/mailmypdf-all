/**
 * Deterministic name normalization.
 *
 * IMPORTANT: this module compares NAME FORMS. It does not establish that two
 * records describe the same legal person or entity.
 */

export type NameKindHint = "person" | "organization" | "unknown";

export type NameComparisonDisposition =
  | "same-normalized-form"
  | "likely-name-variant"
  | "possible-name-variant"
  | "different-name"
  | "insufficient";

export interface NormalizedName {
  readonly raw: string;
  readonly displayForm: string;
  readonly primaryName: string;
  readonly legalForm: string;
  readonly comparisonKey: string;
  readonly tokens: readonly string[];
  readonly suffix?: string | undefined;
  readonly organizationDesignator?: string | undefined;
  readonly capacityHints: readonly string[];
  readonly tradeName?: string | undefined;
  readonly kindHint: NameKindHint;
  readonly searchVariants: readonly string[];
}

export interface NameComparison {
  readonly disposition: NameComparisonDisposition;
  readonly confidence: number;
  readonly reasons: readonly string[];
  readonly left: NormalizedName;
  readonly right: NormalizedName;
}

const PERSON_SUFFIXES: Readonly<Record<string, string>> = {
  jr: "Jr.",
  junior: "Jr.",
  sr: "Sr.",
  senior: "Sr.",
  ii: "II",
  iii: "III",
  iv: "IV",
  v: "V",
};

const ORGANIZATION_DESIGNATORS: readonly {
  readonly pattern: readonly string[];
  readonly canonical: string;
}[] = [
  { pattern: ["limited", "liability", "company"], canonical: "LLC" },
  { pattern: ["l", "l", "c"], canonical: "LLC" },
  { pattern: ["llc"], canonical: "LLC" },
  { pattern: ["incorporated"], canonical: "Inc." },
  { pattern: ["inc"], canonical: "Inc." },
  { pattern: ["corporation"], canonical: "Corp." },
  { pattern: ["corp"], canonical: "Corp." },
  { pattern: ["limited", "partnership"], canonical: "LP" },
  { pattern: ["l", "p"], canonical: "LP" },
  { pattern: ["lp"], canonical: "LP" },
  { pattern: ["limited", "liability", "partnership"], canonical: "LLP" },
  { pattern: ["l", "l", "p"], canonical: "LLP" },
  { pattern: ["llp"], canonical: "LLP" },
  { pattern: ["professional", "limited", "liability", "company"], canonical: "PLLC" },
  { pattern: ["pllc"], canonical: "PLLC" },
  { pattern: ["professional", "corporation"], canonical: "PC" },
  { pattern: ["p", "c"], canonical: "PC" },
  { pattern: ["pc"], canonical: "PC" },
];

const CAPACITY_HINTS = [
  "personal representative",
  "administrator",
  "executor",
  "trustee",
  "manager",
  "member",
  "president",
  "agent",
  "guarantor",
] as const;

function cleanSurface(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function fold(value: string): string {
  return cleanSurface(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function tokenWords(value: string): string[] {
  return cleanSurface(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function stripTrailingPattern(
  words: readonly string[],
  patterns: readonly { pattern: readonly string[]; canonical: string }[],
): { remaining: string[]; canonical?: string } {
  for (const entry of patterns) {
    if (entry.pattern.length > words.length) continue;
    const start = words.length - entry.pattern.length;
    const tail = words.slice(start);
    if (tail.every((token, index) => token === entry.pattern[index])) {
      return { remaining: words.slice(0, start), canonical: entry.canonical };
    }
  }
  return { remaining: [...words] };
}

function titleToken(token: string): string {
  if (!token) return token;
  if (/^[ivx]+$/i.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function reconstructWords(words: readonly string[]): string {
  return words.map(titleToken).join(" ");
}

function parseTradeName(value: string): { base: string; tradeName?: string } {
  const match = value.match(/^(.*?)\s+(?:d\s*\/?\s*b\s*\/?\s*a\.?|doing\s+business\s+as)\s+(.+)$/i);
  if (!match) return { base: value };
  return {
    base: cleanSurface(match[1] ?? ""),
    tradeName: cleanSurface(match[2] ?? ""),
  };
}

function parseCapacity(value: string): { base: string; capacityHints: string[] } {
  const lower = value.toLowerCase();
  const hints = CAPACITY_HINTS.filter((hint) =>
    new RegExp(`(?:,|\\bas\\s+)\\s*${hint.replace(/ /g, "\\s+")}\\.?$`, "i").test(lower),
  );
  if (hints.length === 0) return { base: value, capacityHints: [] };

  let base = value;
  for (const hint of hints) {
    base = base.replace(
      new RegExp(`(?:,|\\bas\\s+)\\s*${hint.replace(/ /g, "\\s+")}\\.?$`, "i"),
      "",
    );
  }
  return { base: cleanSurface(base), capacityHints: [...hints] };
}

function dedupeVariants(values: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const cleaned = cleanSurface(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

export function normalizeName(raw: string): NormalizedName {
  const displayForm = cleanSurface(raw);
  if (!displayForm) {
    return {
      raw,
      displayForm: "",
      primaryName: "",
      legalForm: "",
      comparisonKey: "",
      tokens: [],
      capacityHints: [],
      kindHint: "unknown",
      searchVariants: [],
    };
  }

  const trade = parseTradeName(displayForm);
  const capacity = parseCapacity(trade.base);
  let words = tokenWords(capacity.base);

  let suffix: string | undefined;
  const last = words.at(-1);
  if (last && PERSON_SUFFIXES[last]) {
    suffix = PERSON_SUFFIXES[last];
    words = words.slice(0, -1);
  }

  const designator = stripTrailingPattern(words, ORGANIZATION_DESIGNATORS);
  words = designator.remaining;

  const primaryName = reconstructWords(words);
  const kindHint: NameKindHint = designator.canonical
    ? "organization"
    : capacity.capacityHints.some((hint) => hint === "trustee" || hint === "executor" || hint === "administrator")
      ? "person"
      : "unknown";

  const legalForm = cleanSurface(
    [primaryName, suffix, designator.canonical].filter(Boolean).join(" "),
  );

  const comparisonKey = fold(legalForm);
  const searchVariants = dedupeVariants([
    displayForm,
    legalForm,
    primaryName,
    trade.tradeName,
  ]);

  return {
    raw,
    displayForm,
    primaryName,
    legalForm,
    comparisonKey,
    tokens: tokenWords(primaryName),
    suffix,
    organizationDesignator: designator.canonical,
    capacityHints: capacity.capacityHints,
    tradeName: trade.tradeName,
    kindHint,
    searchVariants,
  };
}

function middleInitialVariant(a: NormalizedName, b: NormalizedName): boolean {
  if (a.tokens.length < 2 || b.tokens.length < 2) return false;
  const aFirst = a.tokens[0];
  const bFirst = b.tokens[0];
  const aLast = a.tokens.at(-1);
  const bLast = b.tokens.at(-1);
  if (!aFirst || !bFirst || !aLast || !bLast) return false;
  if (aFirst !== bFirst || aLast !== bLast) return false;

  const aMiddle = a.tokens.slice(1, -1);
  const bMiddle = b.tokens.slice(1, -1);
  if (aMiddle.length !== bMiddle.length || aMiddle.length === 0) return false;

  return aMiddle.every((token, index) => {
    const other = bMiddle[index];
    if (!other) return false;
    return token === other || token.charAt(0) === other.charAt(0);
  });
}

export function compareNormalizedNames(
  leftInput: string | NormalizedName,
  rightInput: string | NormalizedName,
): NameComparison {
  const left = typeof leftInput === "string" ? normalizeName(leftInput) : leftInput;
  const right = typeof rightInput === "string" ? normalizeName(rightInput) : rightInput;

  if (!left.comparisonKey || !right.comparisonKey) {
    return {
      disposition: "insufficient",
      confidence: 0,
      reasons: ["One or both names are empty after normalization."],
      left,
      right,
    };
  }

  if (left.comparisonKey === right.comparisonKey) {
    return {
      disposition: "same-normalized-form",
      confidence: 1,
      reasons: ["Case, punctuation, spacing, diacritics, and recognized designator/suffix variants normalize to the same form."],
      left,
      right,
    };
  }

  const sameBase = fold(left.primaryName) !== "" && fold(left.primaryName) === fold(right.primaryName);
  if (sameBase && left.organizationDesignator !== right.organizationDesignator) {
    return {
      disposition: "likely-name-variant",
      confidence: 0.82,
      reasons: ["The base name matches but an organization designator is missing or differs; this is a search/comparison observation, not an identity determination."],
      left,
      right,
    };
  }

  if (sameBase && left.suffix !== right.suffix) {
    return {
      disposition: "possible-name-variant",
      confidence: 0.55,
      reasons: ["The base personal name matches but the suffix differs or is omitted, which can be legally significant."],
      left,
      right,
    };
  }

  if (middleInitialVariant(left, right)) {
    return {
      disposition: "possible-name-variant",
      confidence: 0.62,
      reasons: ["First and last names match and middle-name tokens differ only between full forms and initials."],
      left,
      right,
    };
  }

  return {
    disposition: "different-name",
    confidence: 0.9,
    reasons: ["The names do not satisfy the deterministic variant rules."],
    left,
    right,
  };
}
