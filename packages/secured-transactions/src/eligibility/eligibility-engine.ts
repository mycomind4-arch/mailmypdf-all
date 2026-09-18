import type {
  SecuredTransactionReadinessCheck,
  SecuredTransactionReadinessInput,
  SecuredTransactionReadinessPolicy,
  SecuredTransactionReadinessResult,
} from "./types.js";

function check(
  id: string,
  status: SecuredTransactionReadinessCheck["status"],
  message: string,
  humanReviewRequired = false,
): SecuredTransactionReadinessCheck {
  return { id, status, message, humanReviewRequired };
}

export function validateSecuredTransactionReadinessPolicy(
  policy: SecuredTransactionReadinessPolicy,
): void {
  if (!policy.id.trim()) throw new Error("READINESS_POLICY_ID_REQUIRED");
  if (!policy.purpose.trim()) throw new Error("READINESS_POLICY_PURPOSE_REQUIRED");
  if (!Number.isInteger(policy.minimumCollateralAssets) || policy.minimumCollateralAssets < 0) {
    throw new Error("READINESS_MINIMUM_COLLATERAL_ASSETS_INVALID");
  }
  if (policy.requireAuthorityToAct && !policy.acceptedAuthorityDispositions?.length) {
    throw new Error("READINESS_ACCEPTED_AUTHORITY_DISPOSITIONS_REQUIRED");
  }
}

export function evaluateSecuredTransactionReadiness(input: {
  policy: SecuredTransactionReadinessPolicy;
  matter: SecuredTransactionReadinessInput;
}): SecuredTransactionReadinessResult {
  validateSecuredTransactionReadinessPolicy(input.policy);
  const checks: SecuredTransactionReadinessCheck[] = [];
  const blockers: string[] = [];
  const limitations: string[] = [];
  let humanReview = false;

  if (!input.policy.acceptedCertificationStatuses.includes(input.matter.certification.status)) {
    const review = input.matter.certification.status === "human-review-required";
    checks.push(check(
      "identity-capacity-certification",
      "fail",
      `Identity/capacity certification status ${input.matter.certification.status} is not accepted by this readiness policy.`,
      review,
    ));
    blockers.push("identity-capacity-certification-not-accepted");
    humanReview ||= review;
  } else {
    checks.push(check(
      "identity-capacity-certification",
      input.matter.certification.status === "certified-with-limits" ? "warning" : "pass",
      `Identity/capacity certification status: ${input.matter.certification.status}.`,
    ));
    if (input.matter.certification.status === "certified-with-limits") {
      limitations.push(...input.matter.certification.limitations.map((value) => `certification:${value}`));
    }
  }

  const obligationFields = new Set(input.matter.obligation.terms.map((term) => term.field));
  const missingObligationFields = input.policy.requiredObligationFields.filter(
    (field) => !obligationFields.has(field as never),
  );
  if (input.matter.obligation.requiresHumanReview) {
    checks.push(check("obligation-review", "fail", "Obligation resolution requires human review.", true));
    blockers.push("obligation-human-review-required");
    humanReview = true;
  } else if (missingObligationFields.length > 0) {
    checks.push(check(
      "obligation-fields",
      "fail",
      `Required obligation fields remain unresolved: ${missingObligationFields.join(", ")}.`,
    ));
    blockers.push("required-obligation-fields-missing");
  } else {
    checks.push(check("obligation", "pass", "Required obligation evidence is resolved."));
  }

  if (input.policy.requireAuthorityToAct) {
    if (!input.matter.authorityToAct) {
      checks.push(check("authority-to-act", "fail", "Authority-to-act evidence is required but missing."));
      blockers.push("authority-to-act-missing");
    } else if (input.matter.authorityToAct.requiresHumanReview) {
      checks.push(check("authority-to-act", "fail", "Authority-to-act resolution requires human review.", true));
      blockers.push("authority-to-act-human-review-required");
      humanReview = true;
    } else if (!input.policy.acceptedAuthorityDispositions!.includes(input.matter.authorityToAct.disposition)) {
      checks.push(check(
        "authority-to-act",
        "fail",
        `Authority disposition ${input.matter.authorityToAct.disposition} is not accepted for this analysis purpose.`,
      ));
      blockers.push("authority-to-act-not-accepted");
    } else {
      checks.push(check("authority-to-act", "pass", `Authority disposition: ${input.matter.authorityToAct.disposition}.`));
    }
  }

  const qualifying = new Set(input.policy.qualifyingInterestTypes ?? []);
  const candidateCollateralAssetIds = input.matter.ownershipRights
    .filter((result) => !result.requiresHumanReview)
    .filter((result) => result.interests.some((interest) =>
      interest.holderEntityId === input.matter.debtorEntityId &&
      (!input.policy.qualifyingInterestTypes?.length || qualifying.has(interest.interestType)),
    ))
    .map((result) => result.assetId);

  const rightsReviewRequired = input.matter.ownershipRights.some((result) => result.requiresHumanReview);
  if (rightsReviewRequired) {
    limitations.push("one-or-more-asset-rights-results-require-review");
  }

  if (
    input.policy.requireCollateralRightsEvidence &&
    candidateCollateralAssetIds.length < input.policy.minimumCollateralAssets
  ) {
    checks.push(check(
      "collateral-rights",
      "fail",
      `Only ${candidateCollateralAssetIds.length} asset(s) satisfy the policy's evidence-ready rights filter; ${input.policy.minimumCollateralAssets} required.`,
      rightsReviewRequired,
    ));
    blockers.push("collateral-rights-evidence-insufficient");
    humanReview ||= rightsReviewRequired;
  } else {
    checks.push(check(
      "collateral-rights",
      rightsReviewRequired ? "warning" : "pass",
      `${candidateCollateralAssetIds.length} asset(s) pass the configured rights-evidence filter.`,
    ));
  }

  const failed = checks.some((item) => item.status === "fail");
  const warned = checks.some((item) => item.status === "warning") || limitations.length > 0;

  return {
    policyId: input.policy.id,
    purpose: input.policy.purpose,
    debtorEntityId: input.matter.debtorEntityId,
    status: failed
      ? humanReview ? "human-review-required" : "insufficient-evidence"
      : warned ? "ready-with-limits" : "ready-for-analysis",
    checks,
    candidateCollateralAssetIds: [...new Set(candidateCollateralAssetIds)],
    blockers: [...new Set(blockers)],
    limitations: [...new Set(limitations)],
  };
}
