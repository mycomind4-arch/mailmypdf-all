import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessCollateralOwnershipAndClassification,
  resolveCollateralClassification,
} from "../src/collateral/index.js";

describe("collateral ownership and classification", () => {
  test("resolves a sourced candidate classification without deciding legal consequences", () => {
    const result = resolveCollateralClassification({
      assetId: "asset-1",
      claims: [{
        id: "classification-1",
        assetId: "asset-1",
        classification: "equipment",
        effect: "supports",
        sourceRefs: ["asset-schedule"],
        confidence: 0.9,
      }],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.classification, "equipment");
  });

  test("does not accept an unsourced classification claim", () => {
    const result = resolveCollateralClassification({
      assetId: "asset-1",
      claims: [{
        id: "classification-1",
        assetId: "asset-1",
        classification: "equipment",
        effect: "supports",
        sourceRefs: [],
        confidence: 0.9,
      }],
    });

    assert.equal(result.disposition, "human-review-required");
  });

  test("multiple strongly supported classes require review", () => {
    const result = resolveCollateralClassification({
      assetId: "asset-1",
      claims: [
        { id: "a", assetId: "asset-1", classification: "equipment", effect: "supports", sourceRefs: ["record-a"], confidence: 0.9 },
        { id: "b", assetId: "asset-1", classification: "inventory", effect: "supports", sourceRefs: ["record-b"], confidence: 0.9 },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
  });

  test("combines ownership evidence without declaring debtor rights in collateral", () => {
    const result = assessCollateralOwnershipAndClassification({
      assetId: "asset-1",
      ownershipClaims: [{
        id: "title",
        assetId: "asset-1",
        holderEntityId: "owner-1",
        interestType: "recorded-owner",
        effect: "supports",
        source: {
          id: "title-source",
          sourceType: "recorded-title",
          provenanceLevel: "external_source",
        },
      }],
      classificationClaims: [{
        id: "classification",
        assetId: "asset-1",
        classification: "equipment",
        effect: "supports",
        sourceRefs: ["asset-schedule"],
        confidence: 0.9,
      }],
    });

    assert.equal(result.status, "ready-for-further-analysis");
    assert.equal(result.debtorRightsInCollateralDetermined, false);
  });
});
