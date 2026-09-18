import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessSecurityAgreementEvidence,
} from "../src/obligations/index.js";
import {
  assessAttachmentReadiness,
} from "../src/certification/index.js";

const source = {
  id: "source-1",
  kind: "document" as const,
  label: "Synthetic agreement",
};

describe("security-agreement evidence and attachment readiness", () => {
  test("blocks an agreement record that lacks authenticated evidence", () => {
    const result = assessSecurityAgreementEvidence({
      agreementId: "agreement-1",
      debtorFindingId: "debtor",
      securedPartyFindingId: "secured-party",
      obligationFindingId: "obligation",
      collateralDescription: "Specific synthetic collateral description",
      sourceRefs: [source],
      authenticatedEvidence: false,
    });

    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("authenticated-evidence"));
    assert.equal(result.legalSufficiencyDetermined, false);
  });

  test("evidence-ready agreement still does not determine legal sufficiency", () => {
    const result = assessSecurityAgreementEvidence({
      agreementId: "agreement-1",
      debtorFindingId: "debtor",
      securedPartyFindingId: "secured-party",
      obligationFindingId: "obligation",
      collateralDescription: "Specific synthetic collateral description",
      sourceRefs: [source],
      authenticatedEvidence: true,
      authenticationSourceRefs: [source],
    });

    assert.equal(result.status, "evidence-ready");
    assert.equal(result.legalSufficiencyDetermined, false);
  });

  test("attachment readiness blocks until all upstream evidence layers are ready", () => {
    const agreement = assessSecurityAgreementEvidence({
      agreementId: "agreement-1",
      sourceRefs: [],
      authenticatedEvidence: false,
    });

    const result = assessAttachmentReadiness({
      obligationValue: {
        status: "blocked",
        obligation: {
          obligationId: "o",
          disposition: "insufficient-evidence",
          terms: [],
          evaluatedClaims: [],
          missingRequiredFields: [],
          conflicts: [],
          reasons: [],
          ruleIds: [],
          requiresHumanReview: false,
        },
        valueEvidence: {
          status: "insufficient-evidence",
          supportingClaimIds: [],
          contradictingClaimIds: [],
          sourceRefs: [],
          reasons: [],
          requiresHumanReview: false,
        },
        reasons: [],
        requiresHumanReview: false,
        canProceedToFurtherAnalysis: false,
        legalValueDetermined: false,
      },
      collateral: {
        status: "blocked",
        ownership: {
          assetId: "a",
          disposition: "insufficient-evidence",
          interests: [],
          evaluatedClaims: [],
          conflicts: [],
          reasons: [],
          ruleIds: [],
          requiresHumanReview: false,
        },
        classification: {
          assetId: "a",
          disposition: "insufficient-evidence",
          confidence: 0,
          supportingClaimIds: [],
          contradictingClaimIds: [],
          sourceRefs: [],
          reasons: [],
          requiresHumanReview: false,
        },
        canProceedToFurtherAnalysis: false,
        requiresHumanReview: false,
        debtorRightsInCollateralDetermined: false,
      },
      securityAgreement: agreement,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.canProceedToAuthorityAnalysis, false);
    assert.equal(result.attachmentLegallyDetermined, false);
  });
});
