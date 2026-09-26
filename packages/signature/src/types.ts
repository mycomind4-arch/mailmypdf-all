export type SignatureFieldLocation = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Signer = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type SignatureFieldStatus = "pending" | "signed" | "declined";

export type SignerConsent = {
  /** A clear affirmative act of signing, distinct from merely viewing the document. */
  intentToSign: boolean;
  /** ESIGN Act / UETA baseline: the signer must consent to sign electronically. */
  consentedToElectronicRecords: boolean;
  consentedAt: string;
};

export type SignerRecord = {
  signer: Signer;
  field: SignatureFieldLocation;
  status: SignatureFieldStatus;
  consent?: SignerConsent;
  signedAt?: string;
};

export type SignatureEnvelopeEvent =
  | { type: "created"; at: string }
  | { type: "viewed"; at: string; signerId: string }
  | {
      type: "signed";
      at: string;
      signerId: string;
      consent: SignerConsent;
      ipAddress?: string;
      userAgent?: string;
    }
  | { type: "declined"; at: string; signerId: string; reason: string }
  | { type: "voided"; at: string; reason: string }
  | { type: "expired"; at: string };

export type SignatureEnvelopeStatus = "pending" | "completed" | "declined" | "voided" | "expired";

export type SignatureRequest = {
  documentId: string;
  documentSha256: string;
  signers: readonly SignerRecord[];
  createdAt: string;
  expiresAt?: string;
};

export type SignatureEnvelope = {
  id: string;
  documentId: string;
  documentSha256: string;
  signers: readonly SignerRecord[];
  status: SignatureEnvelopeStatus;
  events: readonly SignatureEnvelopeEvent[];
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
};
