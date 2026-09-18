import type { ObligationValueAssessment } from "../obligations/index.js";
import type { CollateralOwnershipClassificationAssessment } from "../collateral/index.js";
import type { SecurityAgreementEvidenceAssessment } from "../obligations/security-agreement-record.js";

export interface AttachmentReadinessAssessment {
  status: "ready-for-authority-analysis" | "human-review-required" | "blocked";
  reasons: readonly string[];
  blockers: readonly string[];
  requiresHumanReview: boolean;
  canProceedToAuthorityAnalysis: boolean;
  /**
   * Readiness is not a legal conclusion that attachment occurred.
   * Jurisdiction-specific law and the complete transaction record remain required.
   */
  attachmentLegallyDetermined: false;
}

export function assessAttachmentReadiness(input: {
  obligationValue: ObligationValueAssessment;
  collateral: CollateralOwnershipClassificationAssessment;
  securityAgreement: SecurityAgreementEvidenceAssessment;
}): AttachmentReadinessAssessment {
  const blockers: string[] = [];
  const reasons: string[] = [];
  let requiresHumanReview = false;

  if (input.obligationValue.status !== "ready-for-further-analysis") {
    blockers.push("obligation-value-not-ready");
    requiresHumanReview ||= input.obligationValue.requiresHumanReview;
    reasons.push(...input.obligationValue.reasons);
  }

  if (input.collateral.status !== "ready-for-further-analysis") {
    blockers.push("collateral-ownership-classification-not-ready");
    requiresHumanReview ||= input.collateral.requiresHumanReview;
  }

  if (input.securityAgreement.status !== "evidence-ready") {
    blockers.push("security-agreement-evidence-not-ready");
    requiresHumanReview ||= input.securityAgreement.requiresHumanReview;
    reasons.push(...input.securityAgreement.reasons);
  }

  const canProceedToAuthorityAnalysis = blockers.length === 0;

  if (canProceedToAuthorityAnalysis) {
    reasons.push(
      "The core evidence layers are ready for jurisdiction-specific attachment analysis.",
      "This readiness result does not independently establish legal attachment.",
    );
  }

  return {
    status: canProceedToAuthorityAnalysis
      ? "ready-for-authority-analysis"
      : requiresHumanReview
        ? "human-review-required"
        : "blocked",
    reasons: [...new Set(reasons)],
    blockers: [...new Set(blockers)],
    requiresHumanReview,
    canProceedToAuthorityAnalysis,
    attachmentLegallyDetermined: false,
  };
}
