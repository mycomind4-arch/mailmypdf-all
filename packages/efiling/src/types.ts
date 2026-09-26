export type FilingJurisdictionKind = "court" | "agency";

export type FilingJurisdiction = {
  kind: FilingJurisdictionKind;
  name: string;
  /** e.g. a state, or "federal". Free text on purpose: coverage is provider-specific and must never be assumed complete. */
  region: string;
  caseNumber?: string;
};

export type FilingSubmissionStatus = "pending" | "submitted" | "accepted" | "rejected" | "voided";

export type FilingSubmissionRequest = {
  matterId: string;
  packetId: string;
  packetSha256: string;
  jurisdiction: FilingJurisdiction;
  now: string;
};

export type FilingSubmissionEvent =
  | { type: "submitted"; at: string; providerReference: string }
  | { type: "accepted"; at: string; confirmationNumber: string }
  | { type: "rejected"; at: string; reasonCode: string; message: string }
  | { type: "voided"; at: string; reason: string };

export type FilingSubmission = {
  id: string;
  matterId: string;
  packetId: string;
  packetSha256: string;
  jurisdiction: FilingJurisdiction;
  status: FilingSubmissionStatus;
  events: readonly FilingSubmissionEvent[];
  createdAt: string;
  providerReference?: string;
  confirmationNumber?: string;
};
