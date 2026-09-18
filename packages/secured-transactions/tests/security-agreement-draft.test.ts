import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildSecurityAgreementDraft,
} from "../src/obligations/index.js";

describe("security agreement draft", () => {
  test("builds a review-only draft from explicit findings", () => {
    const result = buildSecurityAgreementDraft({
      agreementId: "agreement-1",
      debtorName: "Example Debtor LLC",
      securedPartyName: "Example Secured Party LLC",
      debtorFindingId: "debtor-finding",
      securedPartyFindingId: "secured-party-finding",
      obligationFindingId: "obligation-finding",
      collateralFindingIds: ["collateral-finding"],
      obligationDescription:
        "Synthetic obligation for testing.",
      collateralDescription:
        "Synthetic identified collateral for testing.",
      governingLawJurisdiction: "TEST-1",
    });

    assert.equal(
      result.status,
      "prepared-for-review",
    );

    assert.equal(
      result.canExecute,
      false,
    );

    assert.equal(
      result.legalSufficiencyDetermined,
      false,
    );

    assert.match(
      result.renderedText ?? "",
      /DRAFT FOR REVIEW/,
    );
  });

  test("fails closed when material findings are missing", () => {
    const result = buildSecurityAgreementDraft({
      agreementId: "agreement-1",
      debtorName: "Example Debtor LLC",
      securedPartyName: "",
      debtorFindingId: "debtor-finding",
      securedPartyFindingId: "",
      obligationFindingId: "obligation-finding",
      collateralFindingIds: [],
      obligationDescription: "Synthetic obligation",
      collateralDescription: "Synthetic collateral",
    });

    assert.equal(
      result.status,
      "blocked",
    );

    assert.equal(
      result.canExecute,
      false,
    );
  });
});
