import assert from "node:assert/strict";
import test from "node:test";
import { composeSecurityAgreementReview } from "../workflow-composition";

test("security-agreement workflow refuses a draft without authenticated evidence", () => {
  const result = composeSecurityAgreementReview({
    evidence: {
      agreementId: "agreement-1",
      debtorFindingId: "debtor-1",
      securedPartyFindingId: "party-1",
      obligationFindingId: "obligation-1",
      collateralDescription: "Equipment described in the source agreement",
      sourceRefs: [{ id: "source-1", kind: "document", label: "Agreement" }],
      authenticatedEvidence: false,
    },
    draft: {
      agreementId: "agreement-1",
      debtorName: "Example Debtor LLC",
      securedPartyName: "Example Secured Party",
      debtorFindingId: "debtor-1",
      securedPartyFindingId: "party-1",
      obligationFindingId: "obligation-1",
      collateralFindingIds: ["collateral-1"],
      obligationDescription: "Documented obligation",
      collateralDescription: "Equipment described in the source agreement",
    },
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.missing.includes("authenticated-evidence"), true);
  assert.equal(result.consequentialActionAllowed, false);
});
