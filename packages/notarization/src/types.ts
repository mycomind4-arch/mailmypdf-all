import type { VerifiedIdentity } from "@mailmypdf/identity-verification";

export type NotarizationSessionStatus = "pending" | "notarized" | "declined" | "voided" | "expired";

export type NotaryAttestation = {
  notaryName: string;
  notaryCommissionNumber: string;
  notaryJurisdiction: string;
  sealedAt: string;
  /** Journal entries are a legal recordkeeping requirement for notaries in most US states. */
  journalEntryId: string;
};

export type NotarizationSessionRequest = {
  documentId: string;
  documentSha256: string;
  /**
   * Proof that the signer's identity was already confirmed — a notary must
   * not notarize an unverified signer. This package never performs identity
   * verification itself; it only accepts the result.
   */
  verifiedSignerIdentity: VerifiedIdentity;
  now: string;
  expiresAt?: string;
};

export type NotarizationSession = {
  id: string;
  documentId: string;
  documentSha256: string;
  verifiedSignerIdentity: VerifiedIdentity;
  status: NotarizationSessionStatus;
  createdAt: string;
  expiresAt?: string;
  attestation?: NotaryAttestation;
  declineReason?: string;
  voidReason?: string;
};
