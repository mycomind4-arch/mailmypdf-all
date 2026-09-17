import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveOwnershipRights,
  ownershipRightsToFinding,
} from "../src/index.js";

describe("ownership and rights resolution", () => {
  test("resolves recorded ownership from strong title evidence", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [{
        id: "title-1",
        assetId: "asset-1",
        holderEntityId: "owner-1",
        interestType: "recorded-owner",
        effect: "supports",
        source: {
          id: "recorded-title",
          sourceType: "recorded-title",
          provenanceLevel: "external_source",
        },
      }],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.interests[0]?.holderEntityId, "owner-1");
    assert.equal(result.interests[0]?.interestType, "recorded-owner");
  });

  test("keeps possession separate from title ownership", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [
        {
          id: "title-1",
          assetId: "asset-1",
          holderEntityId: "owner-1",
          interestType: "recorded-owner",
          effect: "supports",
          source: {
            id: "recorded-title",
            sourceType: "recorded-title",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "lease-1",
          assetId: "asset-1",
          holderEntityId: "tenant-1",
          interestType: "possessor",
          effect: "supports",
          source: {
            id: "lease",
            sourceType: "executed-contract",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved-multiple-interests");
    assert.ok(result.interests.some((interest) => interest.interestType === "recorded-owner"));
    assert.ok(result.interests.some((interest) => interest.interestType === "possessor"));
  });

  test("does not treat an invoice alone as proof of present ownership", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [{
        id: "invoice",
        assetId: "asset-1",
        holderEntityId: "buyer-1",
        interestType: "exclusive-owner",
        effect: "supports",
        source: {
          id: "invoice-source",
          sourceType: "invoice",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.notEqual(result.disposition, "resolved");
    assert.equal(result.interests.length, 0);
  });

  test("blocks competing exclusive owner claims backed by strong evidence", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [
        {
          id: "order-a",
          assetId: "asset-1",
          holderEntityId: "owner-a",
          interestType: "exclusive-owner",
          effect: "supports",
          source: {
            id: "court-order-a",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "order-b",
          assetId: "asset-1",
          holderEntityId: "owner-b",
          interestType: "exclusive-owner",
          effect: "supports",
          source: {
            id: "court-order-b",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
  });

  test("strong support and strong contradiction for same interest require review", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [
        {
          id: "support",
          assetId: "asset-1",
          holderEntityId: "owner-1",
          interestType: "recorded-owner",
          effect: "supports",
          source: {
            id: "title",
            sourceType: "recorded-title",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "contradiction",
          assetId: "asset-1",
          holderEntityId: "owner-1",
          interestType: "recorded-owner",
          effect: "contradicts",
          source: {
            id: "order",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
  });

  test("converts supported interests into a finding", () => {
    const result = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [{
        id: "title-1",
        assetId: "asset-1",
        holderEntityId: "owner-1",
        interestType: "recorded-owner",
        effect: "supports",
        source: {
          id: "title",
          sourceType: "recorded-title",
          provenanceLevel: "external_source",
        },
      }],
    });

    const finding = ownershipRightsToFinding(result);
    assert.equal(finding.findingType, "ownership_rights_resolution");
    assert.equal(finding.provenance.ruleId, "identity-capacity.ownership-rights.v1");
  });
});
