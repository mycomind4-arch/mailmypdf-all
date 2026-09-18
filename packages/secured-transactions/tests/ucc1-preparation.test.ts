import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prepareUcc1Data } from "../src/filing/index.js";

const source = {
  id: "authorization-source",
  kind: "document" as const,
  label: "Synthetic authorization evidence",
};

const resolvedRule = {
  status: "resolved" as const,
  jurisdiction: "TEST-1",
  ruleId: "synthetic-name-v1",
  value: {
    debtorType: "synthetic",
    controllingSourceDescription: "Synthetic source",
  },
  authorityRefs: [{
    id: "authority",
    title: "Synthetic authority",
    jurisdiction: "TEST-1",
  }],
  reasonCodes: [],
  requiresHumanReview: false,
};

describe("UCC-1 preparation boundary", () => {
  test("prepares reviewable data but never authorizes submission", () => {
    const result = prepareUcc1Data({
      debtorName: "Example Debtor LLC",
      debtorEntityType: "registered-organization",
      debtorNameFindingId: "name-finding",
      debtorNameRule: resolvedRule,
      securedPartyName: "Example Secured Party",
      collateralIndication: "Synthetic collateral description",
      filingJurisdiction: "TEST-1",
      authorization: {
        status: "supported",
        sourceRefs: [source],
      },
    });

    assert.equal(result.status, "prepared-for-review");
    assert.equal(result.canSubmit, false);
    assert.equal(result.requiresHumanReview, true);
  });

  test("blocks unsupported debtor-name rule coverage", () => {
    const result = prepareUcc1Data({
      debtorName: "Example Debtor LLC",
      debtorEntityType: "registered-organization",
      debtorNameFindingId: "name-finding",
      debtorNameRule: {
        status: "unsupported",
        jurisdiction: "TEST-1",
        authorityRefs: [],
        reasonCodes: ["no-active-supported-rule-pack"],
        requiresHumanReview: false,
      },
      securedPartyName: "Example Secured Party",
      collateralIndication: "Synthetic collateral description",
      filingJurisdiction: "TEST-1",
      authorization: {
        status: "supported",
        sourceRefs: [source],
      },
    });
    assert.equal(result.status, "unsupported");
  });

  test("blocks an unsupported authorization assertion without provenance", () => {
    const result = prepareUcc1Data({
      debtorName: "Example Debtor LLC",
      debtorEntityType: "registered-organization",
      debtorNameFindingId: "name-finding",
      debtorNameRule: resolvedRule,
      securedPartyName: "Example Secured Party",
      collateralIndication: "Synthetic collateral description",
      filingJurisdiction: "TEST-1",
      authorization: {
        status: "supported",
        sourceRefs: [],
      },
    });
    assert.equal(result.status, "blocked");
  });
});
