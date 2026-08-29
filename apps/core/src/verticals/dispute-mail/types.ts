/**
 * DisputeMail Type Definitions
 *
 * Types for the dispute intake, fact extraction, and draft generation
 * workflow. These are vertical-specific and do not duplicate canonical
 * order/payment/fulfillment types.
 */

// ── Dispute Intake ────────────────────────────────────────────────────────────

export interface DisputeIntake {
  /** Who the user is disputing (company, person, institution) */
  recipientName: string;
  /** What the user is disputing (charge, service, contract, etc.) */
  disputeSubject: string;
  /** What happened — plain-language description */
  whatHappened: string;
  /** When the incident occurred (ISO date or free text) */
  whenItHappened?: string;
  /** Amount in dispute, if applicable */
  amount?: string;
  /** What resolution the user wants */
  desiredResolution: string;
  /** Response deadline, if any (ISO date) */
  deadline?: string;
  /** Dispute category (from DISPUTE_CATEGORIES) */
  category?: string;
  /** User's account/reference number with the recipient, if any */
  referenceNumber?: string;
}

// ── Document-Extracted Facts ──────────────────────────────────────────────────

export interface DisputeFacts {
  /** Company/institution identified in uploaded documents */
  senderCompany?: string;
  /** Recipient of the dispute (may differ from document sender) */
  recipient?: string;
  /** Dates found in documents */
  dates?: string[];
  /** Account or reference numbers */
  accountReferenceNumber?: string;
  /** Amounts found in documents */
  amounts?: string[];
  /** Stated reason for the charge/action */
  statedReason?: string;
  /** Relevant claims in the document */
  relevantClaims?: string[];
  /** Deadlines mentioned */
  deadlines?: string[];
  /** Contact information */
  contactInfo?: string;
  /** Dispute-relevant language extracted */
  disputeLanguage?: string;
  /** AI confidence level 0-1 */
  confidence?: number;
  /** Warnings about extraction quality */
  warnings?: string[];
}

// ── AI Draft Request ──────────────────────────────────────────────────────────

export interface DisputeDraftRequest {
  /** The intake form data */
  intake: DisputeIntake;
  /** Facts extracted from uploaded documents (if any) */
  facts?: DisputeFacts;
  /** Whether the user confirmed the extracted facts */
  factsConfirmed?: boolean;
  /** User's additional instructions for the draft */
  userInstructions?: string;
}

// ── AI Draft Response ──────────────────────────────────────────────────────────

export interface DisputeDraftResponse {
  /** The generated dispute letter text */
  letterText: string;
  /** Estimated page count */
  pageCount: number;
  /** Whether facts were AI-inferred (vs user-provided) */
  hasInferences: boolean;
  /** Warnings about the draft */
  warnings: string[];
}
