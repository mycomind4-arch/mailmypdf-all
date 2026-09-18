export type NameKind =
  | "person"
  | "organization"
  | "trust"
  | "estate"
  | "trade-name"
  | "unknown";

export type AuthorityLevel =
  | "authoritative"
  | "official"
  | "supporting"
  | "user-provided"
  | "unknown";

export interface NameSourceMetadata {
  sourceId?: string;
  sourceType?: string;
  authorityLevel?: AuthorityLevel;
  jurisdiction?: string;
  observedAt?: string;
}

export type PersonSuffix =
  | "JR"
  | "SR"
  | "II"
  | "III"
  | "IV"
  | "V";

export interface NormalizedName {
  /** Exact incoming value. */
  raw: string;

  /** Unicode/spacing normalized while preserving meaningful display form. */
  display: string;

  /** Primary party name after separating DBA and representative-capacity text. */
  primaryName: string;

  kind: NameKind;

  suffix?: PersonSuffix;

  /**
   * Textual capacity hints only.
   *
   * Example:
   * "John Smith, Trustee" -> ["trustee"]
   *
   * This DOES NOT establish that John is actually trustee.
   */
  capacityHints: string[];

  /**
   * Example:
   * "John Smith DBA Smith Welding"
   *
   * primaryName = "John Smith"
   * tradeName = "Smith Welding"
   */
  tradeName?: string;

  organizationDesignator?: string;

  /**
   * Conservative comparison key.
   *
   * This is NOT a legally authoritative name.
   */
  strictKey: string;

  /**
   * More permissive matching/search key.
   *
   * Never use this as a filing name.
   */
  relaxedKey: string;

  /**
   * Diacritic-insensitive key for discovery/search.
   */
  foldedKey: string;

  tokens: string[];

  source?: NameSourceMetadata;
}

export type NameSearchVariantReason =
  | "source-preserved"
  | "normalized"
  | "punctuation-variant"
  | "middle-initial"
  | "middle-omitted"
  | "suffix-omitted"
  | "organization-designator"
  | "trade-name";

export interface NameSearchVariant {
  value: string;

  reason: NameSearchVariantReason;

  /**
   * Search variants must never automatically become filing names.
   */
  purpose:
    | "search-only"
    | "source-preserved";
}

export type NameComparisonDisposition =
  | "same-normalized-form"
  | "likely-name-variant"
  | "possible-name-variant"
  | "different-name"
  | "insufficient";

export interface NameComparison {
  disposition: NameComparisonDisposition;

  /**
   * Confidence in the NAME comparison only.
   *
   * This does not establish that two records identify
   * the same legal person or entity.
   */
  confidence: number;

  reasons: string[];

  left: NormalizedName;

  right: NormalizedName;
}

const PERSON_SUFFIXES: Record<
  string,
  PersonSuffix
> = {
  JR: "JR",
  JUNIOR: "JR",
  SR: "SR",
  SENIOR: "SR",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
};

interface OrganizationDesignator {
  canonical: string;

  pattern: RegExp;

  searchVariants: string[];
}

const ORGANIZATION_DESIGNATORS: OrganizationDesignator[] = [
  {
    canonical: "LLC",

    pattern:
      /(?:,?\s+)(?:L\.?\s*L\.?\s*C\.?|LIMITED LIABILITY COMPANY)\.?$/i,

    searchVariants: [
      "LLC",
      "L.L.C.",
      "Limited Liability Company",
    ],
  },

  {
    canonical: "PLLC",

    pattern:
      /(?:,?\s+)(?:P\.?\s*L\.?\s*L\.?\s*C\.?|PROFESSIONAL LIMITED LIABILITY COMPANY)\.?$/i,

    searchVariants: [
      "PLLC",
      "P.L.L.C.",
      "Professional Limited Liability Company",
    ],
  },

  {
    canonical: "INC",

    pattern:
      /(?:,?\s+)(?:INC\.?|INCORPORATED)$/i,

    searchVariants: [
      "Inc",
      "Inc.",
      "Incorporated",
    ],
  },

  {
    canonical: "CORP",

    pattern:
      /(?:,?\s+)(?:CORP\.?|CORPORATION)$/i,

    searchVariants: [
      "Corp",
      "Corp.",
      "Corporation",
    ],
  },

  {
    canonical: "LP",

    pattern:
      /(?:,?\s+)(?:L\.?\s*P\.?|LIMITED PARTNERSHIP)\.?$/i,

    searchVariants: [
      "LP",
      "L.P.",
      "Limited Partnership",
    ],
  },

  {
    canonical: "LLP",

    pattern:
      /(?:,?\s+)(?:L\.?\s*L\.?\s*P\.?|LIMITED LIABILITY PARTNERSHIP)\.?$/i,

    searchVariants: [
      "LLP",
      "L.L.P.",
      "Limited Liability Partnership",
    ],
  },

  {
    canonical: "PC",

    pattern:
      /(?:,?\s+)(?:P\.?\s*C\.?|PROFESSIONAL CORPORATION)\.?$/i,

    searchVariants: [
      "PC",
      "P.C.",
      "Professional Corporation",
    ],
  },
];

const CAPACITY_PATTERNS: Array<{
  pattern: RegExp;
  capacity: string;
}> = [
  {
    pattern:
      /(?:,\s*|\s+AS\s+)TRUSTEE\s*$/i,
    capacity: "trustee",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)SUCCESSOR TRUSTEE\s*$/i,
    capacity: "successor-trustee",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)EXECUTOR\s*$/i,
    capacity: "executor",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)PERSONAL REPRESENTATIVE\s*$/i,
    capacity: "personal-representative",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)ADMINISTRATOR\s*$/i,
    capacity: "administrator",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)MANAGER\s*$/i,
    capacity: "manager",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)MEMBER\s*$/i,
    capacity: "member",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)PRESIDENT\s*$/i,
    capacity: "president",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)AGENT\s*$/i,
    capacity: "agent",
  },
  {
    pattern:
      /(?:,\s*|\s+AS\s+)ATTORNEY[- ]IN[- ]FACT\s*$/i,
    capacity: "attorney-in-fact",
  },
];

const DBA_PATTERN =
  /\s+(?:D\s*\/?\s*B\s*\/?\s*A\.?|DBA|DOING\s+BUSINESS\s+AS|T\s*\/?\s*A\.?|TRADING\s+AS)\s+/i;

function unicodeNormalize(
  value: string,
): string {
  return value
    .normalize("NFKC")

    // Curly/special apostrophes -> ASCII apostrophe.
    .replace(
      /[\u2018\u2019\u02BC\uFF07]/g,
      "'",
    )

    // Unicode dash variants -> hyphen.
    .replace(
      /[\u2010\u2011\u2012\u2013\u2014\u2212]/g,
      "-",
    )

    // Non-breaking spaces -> regular spaces.
    .replace(/\u00A0/g, " ")

    .replace(/\s+/g, " ")

    .trim();
}

function normalizePeriodsAndCommas(
  value: string,
): string {
  return value
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function stripDiacritics(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

function normalizeStrictKey(
  value: string,
): string {
  return unicodeNormalize(value)
    .toLocaleUpperCase("en-US")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRelaxedKey(
  value: string,
): string {
  return normalizeStrictKey(value)
    .replace(/['-]/g, " ")
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function parseOrganizationDesignator(
  value: string,
): {
  base: string;
  designator?: string;
} {
  for (
    const descriptor of
    ORGANIZATION_DESIGNATORS
  ) {
    if (
      descriptor.pattern.test(value)
    ) {
      return {
        base: value
          .replace(
            descriptor.pattern,
            "",
          )
          .trim(),

        designator:
          descriptor.canonical,
      };
    }
  }

  return {
    base: value,
  };
}

function canonicalOrganizationComparisonName(
  value: string,
): string {
  const parsed =
    parseOrganizationDesignator(
      value,
    );

  return parsed.designator
    ? `${parsed.base} ${parsed.designator}`
    : parsed.base;
}

function extractCapacity(
  value: string,
): {
  primary: string;
  capacities: string[];
} {
  let primary = value;

  const capacities: string[] = [];

  let changed = true;

  while (changed) {
    changed = false;

    for (
      const item of
      CAPACITY_PATTERNS
    ) {
      if (
        item.pattern.test(primary)
      ) {
        capacities.unshift(
          item.capacity,
        );

        primary = primary
          .replace(
            item.pattern,
            "",
          )
          .trim();

        changed = true;

        break;
      }
    }
  }

  return {
    primary,
    capacities,
  };
}

function parsePersonSuffix(
  value: string,
): {
  base: string;
  suffix?: PersonSuffix;
} {
  const match = value.match(
    /(?:,\s*|\s+)(JR\.?|JUNIOR|SR\.?|SENIOR|II|III|IV|V)\s*$/i,
  );

  if (!match) {
    return {
      base: value,
    };
  }

  const rawSuffix = match[1]
    .replace(/\./g, "")
    .toLocaleUpperCase(
      "en-US",
    );

  return {
    base: value
      .slice(
        0,
        match.index,
      )
      .trim(),

    suffix:
      PERSON_SUFFIXES[
        rawSuffix
      ],
  };
}

function inferKind(
  primary: string,
  tradeName:
    | string
    | undefined,
  organizationDesignator:
    | string
    | undefined,
): NameKind {
  if (
    tradeName &&
    !primary
  ) {
    return "trade-name";
  }

  if (
    /^ESTATE\s+OF\b/i.test(
      primary,
    )
  ) {
    return "estate";
  }

  if (
    /\b(?:REVOCABLE\s+)?(?:LIVING\s+)?TRUST\b/i.test(
      primary,
    )
  ) {
    return "trust";
  }

  if (
    organizationDesignator
  ) {
    return "organization";
  }

  /**
   * Conservative human-name heuristic.
   *
   * Classification assistance only.
   */
  const tokens = primary
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (
    tokens.length >= 2 &&
    tokens.length <= 6 &&
    tokens.every((token) =>
      /^[\p{L}'-]+$/u.test(
        token,
      ),
    )
  ) {
    return "person";
  }

  return "unknown";
}

export function normalizeName(
  input: string,
  source?: NameSourceMetadata,
): NormalizedName {
  if (
    typeof input !== "string"
  ) {
    throw new TypeError(
      "Name must be a string.",
    );
  }

  const raw = input;

  const display =
    normalizePeriodsAndCommas(
      unicodeNormalize(input),
    );

  if (!display) {
    throw new Error(
      "Name cannot be empty.",
    );
  }

  let primaryWithCapacity =
    display;

  let tradeName:
    | string
    | undefined;

  const dbaMatch =
    display.match(
      DBA_PATTERN,
    );

  if (
    dbaMatch &&
    dbaMatch.index !== undefined
  ) {
    primaryWithCapacity =
      display
        .slice(
          0,
          dbaMatch.index,
        )
        .trim();

    tradeName =
      display
        .slice(
          dbaMatch.index +
            dbaMatch[0]
              .length,
        )
        .trim();
  }

  const capacity =
    extractCapacity(
      primaryWithCapacity,
    );

  const personSuffix =
    parsePersonSuffix(
      capacity.primary,
    );

  const organization =
    parseOrganizationDesignator(
      personSuffix.base,
    );

  const primaryName =
    capacity.primary;

  const canonicalForComparison =
    organization.designator
      ? `${organization.base} ${organization.designator}`
      : personSuffix.suffix
        ? `${personSuffix.base} ${personSuffix.suffix}`
        : personSuffix.base;

  const kind = inferKind(
    primaryName,
    tradeName,
    organization.designator,
  );

  const strictKey =
    normalizeStrictKey(
      canonicalForComparison,
    );

  const relaxedKey =
    normalizeRelaxedKey(
      canonicalForComparison,
    );

  const foldedKey =
    normalizeRelaxedKey(
      stripDiacritics(
        canonicalForComparison,
      ),
    );

  const tokens =
    personSuffix.base
      .replace(/[.,]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  return {
    raw,

    display,

    primaryName,

    kind,

    suffix:
      personSuffix.suffix,

    capacityHints:
      capacity.capacities,

    tradeName,

    organizationDesignator:
      organization.designator,

    strictKey,

    relaxedKey,

    foldedKey,

    tokens,

    source,
  };
}

function personCoreTokens(
  name: NormalizedName,
): string[] {
  return name.tokens.map(
    (token) =>
      stripDiacritics(token)
        .toLocaleUpperCase(
          "en-US",
        )
        .replace(
          /[.'-]/g,
          "",
        ),
  );
}

function comparePersonNames(
  left: NormalizedName,
  right: NormalizedName,
):
  | NameComparison
  | undefined {
  if (
    left.kind !== "person" ||
    right.kind !== "person"
  ) {
    return undefined;
  }

  const a =
    personCoreTokens(left);

  const b =
    personCoreTokens(right);

  if (
    a.length < 2 ||
    b.length < 2
  ) {
    return undefined;
  }

  const aFirst = a[0];
  const bFirst = b[0];

  const aLast =
    a[a.length - 1];

  const bLast =
    b[b.length - 1];

  if (
    aFirst !== bFirst ||
    aLast !== bLast
  ) {
    return {
      disposition:
        "different-name",

      confidence: 0.9,

      reasons: [
        "First or last name differs after conservative normalization.",
      ],

      left,
      right,
    };
  }

  const aMiddle =
    a.slice(1, -1);

  const bMiddle =
    b.slice(1, -1);

  if (
    left.suffix &&
    right.suffix &&
    left.suffix !==
      right.suffix
  ) {
    return {
      disposition:
        "different-name",

      confidence: 0.85,

      reasons: [
        `Generational suffix differs (${left.suffix} vs ${right.suffix}).`,
      ],

      left,
      right,
    };
  }

  if (
    aMiddle.join(" ") ===
    bMiddle.join(" ")
  ) {
    return {
      disposition:
        "likely-name-variant",

      confidence:
        left.suffix ===
        right.suffix
          ? 0.96
          : 0.88,

      reasons: [
        "First, middle, and last name components match.",

        ...(
          left.suffix !==
          right.suffix
            ? [
                "A generational suffix appears on only one record; identity must be verified independently.",
              ]
            : []
        ),
      ],

      left,
      right,
    };
  }

  if (
    aMiddle.length === 0 ||
    bMiddle.length === 0
  ) {
    return {
      disposition:
        "possible-name-variant",

      confidence: 0.72,

      reasons: [
        "First and last names match, but one record omits middle-name information.",
        "This is insufficient to establish identity.",
      ],

      left,
      right,
    };
  }

  if (
    aMiddle.length === 1 &&
    bMiddle.length === 1
  ) {
    const aValue =
      aMiddle[0];

    const bValue =
      bMiddle[0];

    if (
      aValue[0] ===
        bValue[0] &&
      (
        aValue.length === 1 ||
        bValue.length === 1
      )
    ) {
      return {
        disposition:
          "possible-name-variant",

        confidence: 0.8,

        reasons: [
          "Middle initial is consistent with the other record's middle name.",
          "A matching initial alone does not establish identity.",
        ],

        left,
        right,
      };
    }

    if (
      aValue[0] !==
      bValue[0]
    ) {
      return {
        disposition:
          "different-name",

        confidence: 0.85,

        reasons: [
          "Middle initials conflict.",
        ],

        left,
        right,
      };
    }
  }

  return {
    disposition:
      "possible-name-variant",

    confidence: 0.62,

    reasons: [
      "First and last names match but middle-name components differ.",
      "Independent evidence is required.",
    ],

    left,
    right,
  };
}

export function compareNames(
  leftInput:
    | string
    | NormalizedName,
  rightInput:
    | string
    | NormalizedName,
): NameComparison {
  const left =
    typeof leftInput ===
    "string"
      ? normalizeName(
          leftInput,
        )
      : leftInput;

  const right =
    typeof rightInput ===
    "string"
      ? normalizeName(
          rightInput,
        )
      : rightInput;

  /**
   * Capitalization never creates a separate legal person.
   */
  if (
    left.strictKey ===
    right.strictKey
  ) {
    return {
      disposition:
        "same-normalized-form",

      confidence: 0.99,

      reasons: [
        "Names match after supported normalization.",
        "This establishes only a matching name form, not legal identity.",
      ],

      left,
      right,
    };
  }

  const incompatibleKinds =
    (
      left.kind === "person" &&
      right.kind ===
        "organization"
    ) ||
    (
      left.kind ===
        "organization" &&
      right.kind === "person"
    );

  if (incompatibleKinds) {
    return {
      disposition:
        "different-name",

      confidence: 0.98,

      reasons: [
        "One name appears to identify an individual and the other an organization.",
      ],

      left,
      right,
    };
  }

  const personComparison =
    comparePersonNames(
      left,
      right,
    );

  if (personComparison) {
    return personComparison;
  }

  if (
    left.foldedKey ===
    right.foldedKey
  ) {
    return {
      disposition:
        "likely-name-variant",

      confidence: 0.91,

      reasons: [
        "Names match after diacritic and punctuation folding.",
        "Verify against authoritative source documents.",
      ],

      left,
      right,
    };
  }

  if (
    left.relaxedKey ===
    right.relaxedKey
  ) {
    return {
      disposition:
        "possible-name-variant",

      confidence: 0.82,

      reasons: [
        "Names match only under relaxed search normalization.",
        "Relaxed normalization must not be used as proof of legal identity.",
      ],

      left,
      right,
    };
  }

  return {
    disposition:
      "different-name",

    confidence: 0.88,

    reasons: [
      "Names remain materially different after supported normalization.",
    ],

    left,
    right,
  };
}

function dedupeVariants(
  values:
    NameSearchVariant[],
): NameSearchVariant[] {
  const seen =
    new Set<string>();

  return values.filter(
    (item) => {
      const key =
        `${item.reason}:${item.value.toLocaleUpperCase(
          "en-US",
        )}`;

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

export function generateSearchVariants(
  input:
    | string
    | NormalizedName,
): NameSearchVariant[] {
  const name =
    typeof input ===
    "string"
      ? normalizeName(input)
      : input;

  const variants:
    NameSearchVariant[] = [
    {
      value: name.display,

      reason:
        "source-preserved",

      purpose:
        "source-preserved",
    },
  ];

  if (
    name.primaryName !==
    name.display
  ) {
    variants.push({
      value:
        name.primaryName,

      reason: "normalized",

      purpose:
        "search-only",
    });
  }

  const punctuationVariant =
    name.primaryName
      .replace(
        /[.'-]/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    punctuationVariant.toLocaleUpperCase(
      "en-US",
    ) !==
    name.primaryName.toLocaleUpperCase(
      "en-US",
    )
  ) {
    variants.push({
      value:
        punctuationVariant,

      reason:
        "punctuation-variant",

      purpose:
        "search-only",
    });
  }

  if (
    name.kind === "person"
  ) {
    const parsed =
      parsePersonSuffix(
        name.primaryName,
      );

    if (name.suffix) {
      variants.push({
        value: parsed.base,

        reason:
          "suffix-omitted",

        purpose:
          "search-only",
      });
    }

    const tokens =
      parsed.base
        .split(/\s+/)
        .filter(Boolean);

    if (
      tokens.length >= 3
    ) {
      const first =
        tokens[0];

      const last =
        tokens[
          tokens.length - 1
        ];

      const middle =
        tokens.slice(
          1,
          -1,
        );

      if (
        middle.length === 1 &&
        middle[0].length > 0
      ) {
        variants.push({
          value:
            `${first} ${middle[0][0]} ${last}`,

          reason:
            "middle-initial",

          purpose:
            "search-only",
        });
      }

      variants.push({
        value:
          `${first} ${last}`,

        reason:
          "middle-omitted",

        purpose:
          "search-only",
      });
    }
  }

  if (
    name.kind ===
      "organization" &&
    name.organizationDesignator
  ) {
    const descriptor =
      ORGANIZATION_DESIGNATORS.find(
        (item) =>
          item.canonical ===
          name.organizationDesignator,
      );

    if (descriptor) {
      const base =
        parseOrganizationDesignator(
          name.primaryName,
        ).base;

      for (
        const designator of
        descriptor.searchVariants
      ) {
        variants.push({
          value:
            `${base} ${designator}`,

          reason:
            "organization-designator",

          purpose:
            "search-only",
        });
      }
    }
  }

  if (name.tradeName) {
    variants.push({
      value:
        name.tradeName,

      reason:
        "trade-name",

      purpose:
        "search-only",
    });
  }

  return dedupeVariants(
    variants,
  );
}

/**
 * Privacy-safe diagnostic object.
 *
 * Deliberately omits raw/display name.
 */
export function safeNameDebugSummary(
  name: NormalizedName,
) {
  return {
    kind: name.kind,

    tokenCount:
      name.tokens.length,

    hasSuffix:
      Boolean(name.suffix),

    hasTradeName:
      Boolean(
        name.tradeName,
      ),

    organizationDesignator:
      name.organizationDesignator ??
      null,

    capacityHints:
      name.capacityHints,

    sourceType:
      name.source
        ?.sourceType ??
      null,

    authorityLevel:
      name.source
        ?.authorityLevel ??
      null,
  };
}
