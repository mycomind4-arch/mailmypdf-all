import {
  assessSecurityAgreementEvidence,
  buildSecurityAgreementDraft,
  type SecurityAgreementEvidenceInput,
  type SecurityAgreementDraftInput,
} from "@mailmypdf/secured-transactions";

export function composeSecurityAgreementReview(input: {
  readonly evidence: SecurityAgreementEvidenceInput;
  readonly draft: SecurityAgreementDraftInput;
}) {
  const evidence = assessSecurityAgreementEvidence(input.evidence);
  if (evidence.status !== "evidence-ready") {
    return {
      status: "blocked" as const,
      evidence,
      draft: undefined,
      requiresHumanReview: evidence.requiresHumanReview,
      legalSufficiencyDetermined: false as const,
      consequentialActionAllowed: false as const,
    };
  }
  const draft = buildSecurityAgreementDraft(input.draft);
  return {
    status: draft.status,
    evidence,
    draft,
    requiresHumanReview: true as const,
    legalSufficiencyDetermined: false as const,
    consequentialActionAllowed: false as const,
  };
}
