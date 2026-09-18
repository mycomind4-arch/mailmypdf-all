import {
  describe,
  expect,
  it,
} from "vitest";

import {
  compareNames,
  generateSearchVariants,
  normalizeName,
  safeNameDebugSummary,
} from "./engine";

describe(
  "name normalization engine",
  () => {
    it(
      "does not treat capitalization as creating a different name",
      () => {
        const result =
          compareNames(
            "JOHN ROBERT SMITH",
            "John Robert Smith",
          );

        expect(
          result.disposition,
        ).toBe(
          "same-normalized-form",
        );
      },
    );

    it(
      "normalizes LLC designator variants",
      () => {
        const result =
          compareNames(
            "Smith Holdings, L.L.C.",
            "SMITH HOLDINGS LLC",
          );

        expect(
          result.disposition,
        ).toBe(
          "same-normalized-form",
        );
      },
    );

    it(
      "normalizes Incorporated variants",
      () => {
        const result =
          compareNames(
            "North Coast Fabrication Incorporated",
            "North Coast Fabrication, Inc.",
          );

        expect(
          result.disposition,
        ).toBe(
          "same-normalized-form",
        );
      },
    );

    it(
      "does not merge an individual and an LLC",
      () => {
        const result =
          compareNames(
            "John Smith",
            "Smith Holdings LLC",
          );

        expect(
          result.disposition,
        ).toBe(
          "different-name",
        );
      },
    );

    it(
      "treats middle initial versus middle name as possible rather than proven",
      () => {
        const result =
          compareNames(
            "John R Smith",
            "John Robert Smith",
          );

        expect(
          result.disposition,
        ).toBe(
          "possible-name-variant",
        );
      },
    );

    it(
      "treats omitted middle name as possible",
      () => {
        const result =
          compareNames(
            "John Smith",
            "John Robert Smith",
          );

        expect(
          result.disposition,
        ).toBe(
          "possible-name-variant",
        );
      },
    );

    it(
      "detects conflicting middle initials",
      () => {
        const result =
          compareNames(
            "John R Smith",
            "John T Smith",
          );

        expect(
          result.disposition,
        ).toBe(
          "different-name",
        );
      },
    );

    it(
      "preserves generational suffixes",
      () => {
        const value =
          normalizeName(
            "John Robert Smith, Jr.",
          );

        expect(
          value.suffix,
        ).toBe("JR");
      },
    );

    it(
      "does not automatically equate different suffixes",
      () => {
        const result =
          compareNames(
            "John Robert Smith Jr.",
            "John Robert Smith Sr.",
          );

        expect(
          result.disposition,
        ).toBe(
          "different-name",
        );
      },
    );

    it(
      "normalizes curly apostrophes",
      () => {
        const value =
          normalizeName(
            " Patrick O’Connor ",
          );

        expect(
          value.display,
        ).toBe(
          "Patrick O'Connor",
        );
      },
    );

    it(
      "normalizes Unicode dashes",
      () => {
        const value =
          normalizeName(
            "Mary Smith–Jones",
          );

        expect(
          value.display,
        ).toBe(
          "Mary Smith-Jones",
        );
      },
    );

    it(
      "supports diacritic-aware matching without declaring identity",
      () => {
        const result =
          compareNames(
            "José Alvarez",
            "Jose Alvarez",
          );

        expect(
          [
            "likely-name-variant",
            "possible-name-variant",
          ],
        ).toContain(
          result.disposition,
        );
      },
    );

    it(
      "parses DBA without treating trade name as individual identity",
      () => {
        const value =
          normalizeName(
            "John Smith d/b/a Smith Welding",
          );

        expect(
          value.primaryName,
        ).toBe(
          "John Smith",
        );

        expect(
          value.tradeName,
        ).toBe(
          "Smith Welding",
        );
      },
    );

    it(
      "creates a trade-name search variant",
      () => {
        const variants =
          generateSearchVariants(
            "John Smith DBA Smith Welding",
          );

        expect(
          variants.some(
            (variant) =>
              variant.value ===
                "Smith Welding" &&
              variant.reason ===
                "trade-name",
          ),
        ).toBe(true);
      },
    );

    it(
      "extracts trustee as a capacity hint only",
      () => {
        const value =
          normalizeName(
            "John Robert Smith, Trustee",
          );

        expect(
          value.primaryName,
        ).toBe(
          "John Robert Smith",
        );

        expect(
          value.capacityHints,
        ).toContain(
          "trustee",
        );
      },
    );

    it(
      "recognizes estate-shaped names as a hint",
      () => {
        const value =
          normalizeName(
            "Estate of Robert Smith",
          );

        expect(
          value.kind,
        ).toBe("estate");
      },
    );

    it(
      "recognizes trust-shaped names as a hint",
      () => {
        const value =
          normalizeName(
            "Smith Family Living Trust",
          );

        expect(
          value.kind,
        ).toBe("trust");
      },
    );

    it(
      "generates middle-name search variants separately from authoritative names",
      () => {
        const variants =
          generateSearchVariants(
            "John Robert Smith Jr.",
          );

        expect(
          variants.some(
            (variant) =>
              variant.value ===
                "John R Smith" &&
              variant.purpose ===
                "search-only",
          ),
        ).toBe(true);

        expect(
          variants.some(
            (variant) =>
              variant.value ===
                "John Smith" &&
              variant.purpose ===
                "search-only",
          ),
        ).toBe(true);
      },
    );

    it(
      "keeps provenance metadata attached",
      () => {
        const value =
          normalizeName(
            "Smith Holdings LLC",
            {
              sourceId:
                "document-123",

              sourceType:
                "public-organic-record",

              authorityLevel:
                "authoritative",

              jurisdiction:
                "US-CA",
            },
          );

        expect(
          value.source
            ?.sourceId,
        ).toBe(
          "document-123",
        );
      },
    );

    it(
      "does not leak names in safe debug summaries",
      () => {
        const value =
          normalizeName(
            "John Robert Smith",
          );

        const debug =
          safeNameDebugSummary(
            value,
          );

        expect(
          debug,
        ).not.toHaveProperty(
          "raw",
        );

        expect(
          debug,
        ).not.toHaveProperty(
          "display",
        );
      },
    );
  },
);
