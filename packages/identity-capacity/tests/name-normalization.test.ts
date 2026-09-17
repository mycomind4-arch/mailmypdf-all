import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  compareNormalizedNames,
} from "../src/index.js";

describe("name normalization", () => {
  test("case alone does not create a different normalized name", () => {
    const result = compareNormalizedNames("JOHN ROBERT SMITH", "John Robert Smith");
    assert.equal(result.disposition, "same-normalized-form");
  });

  test("normalizes common LLC punctuation", () => {
    const left = normalizeName("Smith Holdings, L.L.C.");
    const right = normalizeName("SMITH HOLDINGS LLC");
    assert.equal(left.organizationDesignator, "LLC");
    assert.equal(right.organizationDesignator, "LLC");
    assert.equal(left.comparisonKey, right.comparisonKey);
  });

  test("preserves suffixes structurally", () => {
    const value = normalizeName("John Smith, Jr.");
    assert.equal(value.suffix, "Jr.");
    assert.equal(value.primaryName, "John Smith");
  });

  test("extracts trade name without treating it as the controlling legal name", () => {
    const value = normalizeName("North Coast Services LLC d/b/a Coast Repair");
    assert.equal(value.organizationDesignator, "LLC");
    assert.equal(value.tradeName, "Coast Repair");
    assert.ok(value.searchVariants.includes("Coast Repair"));
  });

  test("extracts representative capacity", () => {
    const value = normalizeName("Jane Smith, Trustee");
    assert.deepEqual(value.capacityHints, ["trustee"]);
    assert.equal(value.primaryName, "Jane Smith");
  });

  test("middle name and middle initial are only a possible variant", () => {
    const result = compareNormalizedNames("John R Smith", "John Robert Smith");
    assert.equal(result.disposition, "possible-name-variant");
  });

  test("different base names remain different", () => {
    const result = compareNormalizedNames("John Smith", "Smith Holdings LLC");
    assert.equal(result.disposition, "different-name");
  });
});
