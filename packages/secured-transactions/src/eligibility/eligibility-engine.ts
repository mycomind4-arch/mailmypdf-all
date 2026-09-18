export const SECURED_TRANSACTION_ELIGIBILITY_GATES = [
  "identifiable-debtor",
  "identifiable-secured-party",
  "actual-obligation",
  "actual-value",
  "debtor-rights-in-collateral",
  "authenticated-security-agreement-or-valid-alternative",
  "specific-collateral",
  "authorization",
  "correct-jurisdiction",
] as const;

export type SecuredTransactionEligibilityGateId =
  typeof SECURED_TRANSACTION_ELIGIBILITY_GATES[number];

export type EligibilityEvidenceStatus =
  | "verified"
  | "unverified"
  | "contradicted";

export interface EligibilityEvidence {
  status: EligibilityEvidenceStatus;
  sourceRefs: readonly string[];
  note?: string;
}

export type SecuredTransactionEligibilityInput =
  Partial<Record<SecuredTransactionEligibilityGateId, EligibilityEvidence>>;

export interface EligibilityGateResult {
  id: SecuredTransactionEligibilityGateId;
  status: EligibilityEvidenceStatus;
  sourceRefs: readonly string[];
  reasons: readonly string[];
  requiresHumanReview: boolean;
}

export interface SecuredTransactionEligibilityResult {
  status: "ready-for-analysis" | "human-review-required" | "blocked";
  gates: readonly EligibilityGateResult[];
  verified: readonly SecuredTransactionEligibilityGateId[];
  missing: readonly SecuredTransactionEligibilityGateId[];
  contradicted: readonly SecuredTransactionEligibilityGateId[];
  requiresHumanReview: boolean;
  canProceedToAnalysis: boolean;
  /**
   * Eligibility alone never authorizes a filing, mailing, payment, execution,
   * or other consequential action. Later workflows must separately satisfy
   * their own rules, authority coverage, validation, and review gates.
   */
  canProceedToConsequentialAction: false;
}

function evaluateGate(
  id: SecuredTransactionEligibilityGateId,
  evidence: EligibilityEvidence | undefined,
): EligibilityGateResult {
  if (!evidence) {
    return {
      id,
      status: "unverified",
      sourceRefs: [],
      reasons: ["No evidence was supplied for this required element."],
      requiresHumanReview: false,
    };
  }

  if (evidence.status === "verified" && evidence.sourceRefs.length === 0) {
    return {
      id,
      status: "unverified",
      sourceRefs: [],
      reasons: ["The element was marked verified but has no supporting source reference."],
      requiresHumanReview: false,
    };
  }

  if (evidence.status === "contradicted") {
    return {
      id,
      status: "contradicted",
      sourceRefs: [...evidence.sourceRefs],
      reasons: [
        evidence.note?.trim() || "Material evidence contradicts this required element.",
      ],
      requiresHumanReview: true,
    };
  }

  if (evidence.status === "unverified") {
    return {
      id,
      status: "unverified",
      sourceRefs: [...evidence.sourceRefs],
      reasons: [
        evidence.note?.trim() || "This required element is not yet supported.",
      ],
      requiresHumanReview: false,
    };
  }

  return {
    id,
    status: "verified",
    sourceRefs: [...evidence.sourceRefs],
    reasons: evidence.note?.trim() ? [evidence.note.trim()] : [],
    requiresHumanReview: false,
  };
}

/**
 * Fail-closed precondition gate for the secured-transaction workflow family.
 *
 * This answers only whether the minimum transaction elements are sufficiently
 * supported to continue into deeper analysis. It does not determine attachment,
 * perfection, filing validity, priority, enforceability, or any legal outcome.
 */
export function evaluateSecuredTransactionEligibility(
  input: SecuredTransactionEligibilityInput,
): SecuredTransactionEligibilityResult {
  const gates = SECURED_TRANSACTION_ELIGIBILITY_GATES.map((id) =>
    evaluateGate(id, input[id]),
  );

  const verified = gates
    .filter((gate) => gate.status === "verified")
    .map((gate) => gate.id);
  const missing = gates
    .filter((gate) => gate.status === "unverified")
    .map((gate) => gate.id);
  const contradicted = gates
    .filter((gate) => gate.status === "contradicted")
    .map((gate) => gate.id);

  const requiresHumanReview = contradicted.length > 0;
  const canProceedToAnalysis =
    missing.length === 0 && contradicted.length === 0;

  return {
    status: canProceedToAnalysis
      ? "ready-for-analysis"
      : requiresHumanReview
        ? "human-review-required"
        : "blocked",
    gates,
    verified,
    missing,
    contradicted,
    requiresHumanReview,
    canProceedToAnalysis,
    canProceedToConsequentialAction: false,
  };
}
