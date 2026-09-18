import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prepareUcc1Data } from "../rules/ucc1-preparation";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("UCC-1 Preparation & Authorization workflow", () => {
  test("unsupported debtor-name rule coverage prevents preparation", () => {
    const result = prepareUcc1Data({
      debtorName: "Example Debtor",
      debtorEntityType: "example",
      debtorNameFindingId: "name-finding",
      debtorNameRule: {
        status: "unsupported",
        jurisdiction: "UNSUPPORTED",
        authorityRefs: [],
        reasonCodes: ["no-active-supported-rule-pack"],
        requiresHumanReview: false,
      },
      securedPartyName: "Example Secured Party",
      collateralIndication: "Example collateral",
      filingJurisdiction: "UNSUPPORTED",
      authorization: {
        status: "unresolved",
        sourceRefs: [],
      },
    });
    assert.equal(result.status, "unsupported");
    assert.equal(result.canSubmit, false);
  });

  test("workflow remains non-executable and cannot submit", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
