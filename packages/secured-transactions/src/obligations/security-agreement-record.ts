import type { SecuredTransactionSourceRef } from "../types.js";

export interface SecurityAgreementEvidenceInput {
  agreementId: string;
  debtorFindingId?: string;
  securedPartyFindingId?: string;
  obligationFindingId?: string;
  collateralDescription?: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  authenticatedEvidence: boolean;
  authenticationSourceRefs?: readonly SecuredTransactionSourceRef[];
}

export interface SecurityAgreementEvidenceAssessment {
  status: "evidence-ready" | "human-review-required" | "blocked";
  agreementId: string;
  debtorFindingId?: string;
  securedPartyFindingId?: string;
  obligationFindingId?: string;
  collateralDescription?: string;
  sourceRefs: readonly SecuredTransactionSourceRef[];
  authenticationSourceRefs: readonly SecuredTransactionSourceRef[];
  missing: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
  /**
   * This is an evidence/readiness assessment only. It does not independently
   * determine that a security agreement is legally sufficient or enforceable.
   */
  legalSufficiencyDetermined: false;
}

function dedupeSources(
  values: readonly SecuredTransactionSourceRef[],
): SecuredTransactionSourceRef[] {
  return [...new Map(values.map((source) => [source.id, source])).values()];
}

export function assessSecurityAgreementEvidence(
  input: SecurityAgreementEvidenceInput,
): SecurityAgreementEvidenceAssessment {
  const agreementId = input.agreementId.trim();
  if (!agreementId) throw new Error("Security-agreement evidence requires an agreement id.");

  const sourceRefs = dedupeSources(input.sourceRefs);
  const authenticationSourceRefs = dedupeSources(input.authenticationSourceRefs ?? []);
  const collateralDescription = input.collateralDescription?.trim() || undefined;

  const missing: string[] = [];
  if (!input.debtorFindingId?.trim()) missing.push("debtor-finding");
  if (!input.securedPartyFindingId?.trim()) missing.push("secured-party-finding");
  if (!input.obligationFindingId?.trim()) missing.push("obligation-finding");
  if (!collateralDescription) missing.push("collateral-description");
  if (sourceRefs.length === 0) missing.push("agreement-source");
  if (!input.authenticatedEvidence) missing.push("authenticated-evidence");
  if (input.authenticatedEvidence && authenticationSourceRefs.length === 0) {
    missing.push("authentication-source");
  }

  const reasons = missing.length
    ? [`Security-agreement evidence is incomplete: ${missing.join(", ")}.`]
    : [
        "The record contains source-linked evidence for the parties, obligation, collateral description, agreement, and authentication.",
        "Legal sufficiency and enforceability remain separate jurisdiction- and fact-specific analyses.",
      ];

  return {
    status: missing.length ? "blocked" : "evidence-ready",
    agreementId,
    debtorFindingId: input.debtorFindingId?.trim() || undefined,
    securedPartyFindingId: input.securedPartyFindingId?.trim() || undefined,
    obligationFindingId: input.obligationFindingId?.trim() || undefined,
    collateralDescription,
    sourceRefs,
    authenticationSourceRefs,
    missing,
    reasons,
    requiresHumanReview: false,
    legalSufficiencyDetermined: false,
  };
}
