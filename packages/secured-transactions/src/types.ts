export type SecuredTransactionFindingStatus =
  | "verified"
  | "conditional"
  | "unresolved"
  | "blocked"
  | "not-applicable";

export interface SecuredTransactionSourceRef {
  id: string;
  kind: "document" | "registry" | "filing" | "authority" | "user-confirmed";
  label: string;
  sourceUri?: string;
  retrievedAt?: string;
}

export interface SecuredTransactionFinding<T = unknown> {
  id: string;
  status: SecuredTransactionFindingStatus;
  value?: T;
  reasonCodes: readonly string[];
  sourceRefs: readonly SecuredTransactionSourceRef[];
  requiresHumanReview: boolean;
}

export interface TransactionPartyRef {
  partyId: string;
  role: "debtor" | "obligor" | "secured-party" | "collateral-owner" | "guarantor" | "representative" | "other";
  capacity?: string;
}

export interface SecuredTransactionMatter {
  matterId: string;
  parties: readonly TransactionPartyRef[];
  obligationFindingId?: string;
  collateralFindingIds: readonly string[];
  governingLawFindingId?: string;
}
