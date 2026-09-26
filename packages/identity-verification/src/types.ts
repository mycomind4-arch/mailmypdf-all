export type VerificationMethod = "document" | "database" | "biometric";

export type VerificationPurpose =
  | "matter-party-identity"
  | "signer-identity"
  | "notarization-prerequisite";

export type VerificationSubject = {
  name: string;
  dateOfBirth?: string;
  matterId: string;
  purpose: VerificationPurpose;
};

export type VerificationCheckResult = {
  method: VerificationMethod;
  passed: boolean;
  confidence: number;
  reasonCodes: readonly string[];
  at: string;
};

export type VerificationSessionStatus = "pending" | "verified" | "failed" | "canceled" | "expired";

export type VerifiedIdentity = {
  name: string;
  dateOfBirth?: string;
  verifiedAt: string;
};

export type VerificationSession = {
  id: string;
  subject: VerificationSubject;
  requiredMethods: readonly VerificationMethod[];
  status: VerificationSessionStatus;
  results: readonly VerificationCheckResult[];
  createdAt: string;
  expiresAt?: string;
  verifiedIdentity?: VerifiedIdentity;
  cancelReason?: string;
};

export type VerificationSessionRequest = {
  subject: VerificationSubject;
  requiredMethods: readonly VerificationMethod[];
  now: string;
  expiresAt?: string;
};
