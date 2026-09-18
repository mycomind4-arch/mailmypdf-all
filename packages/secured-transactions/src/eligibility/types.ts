import type {
  AuthorityToActResult,
  NameCapacityCertification,
  ObligationResolutionResult,
  OwnershipRightsResult,
} from "@mailmypdf/identity-capacity";

export type SecuredTransactionReadinessStatus =
  | "ready-for-analysis"
  | "ready-with-limits"
  | "human-review-required"
  | "insufficient-evidence";

export interface SecuredTransactionReadinessPolicy {
  readonly id: string;
  readonly purpose: string;
  readonly acceptedCertificationStatuses: readonly NameCapacityCertification["status"][];
  readonly requiredObligationFields: readonly string[];
  readonly requireAuthorityToAct: boolean;
  readonly acceptedAuthorityDispositions?: readonly AuthorityToActResult["disposition"][] | undefined;
  readonly requireCollateralRightsEvidence: boolean;
  readonly qualifyingInterestTypes?: readonly string[] | undefined;
  readonly minimumCollateralAssets: number;
}

export interface SecuredTransactionReadinessInput {
  readonly debtorEntityId: string;
  readonly certification: NameCapacityCertification;
  readonly obligation: ObligationResolutionResult;
  readonly ownershipRights: readonly OwnershipRightsResult[];
  readonly authorityToAct?: AuthorityToActResult | undefined;
}

export interface SecuredTransactionReadinessCheck {
  readonly id: string;
  readonly status: "pass" | "warning" | "fail";
  readonly message: string;
  readonly humanReviewRequired: boolean;
}

export interface SecuredTransactionReadinessResult {
  readonly policyId: string;
  readonly purpose: string;
  readonly debtorEntityId: string;
  readonly status: SecuredTransactionReadinessStatus;
  readonly checks: readonly SecuredTransactionReadinessCheck[];
  readonly candidateCollateralAssetIds: readonly string[];
  readonly blockers: readonly string[];
  readonly limitations: readonly string[];
}
