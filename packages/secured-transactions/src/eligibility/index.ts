export {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
} from "./eligibility-engine.js";

export type {
  SecuredTransactionEligibilityGateId,
  EligibilityEvidenceStatus,
  EligibilityEvidence,
  SecuredTransactionEligibilityInput,
  EligibilityGateResult,
  SecuredTransactionEligibilityResult,
} from "./eligibility-engine.js";
