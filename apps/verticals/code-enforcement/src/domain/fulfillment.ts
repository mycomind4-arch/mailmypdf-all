/**
 * Fulfillment, Tracking & Proof
 *
 * Code Enforcement → approved document package → MailMyPDF fulfillment → tracking → proof.
 * Do not fake fulfillment. Until real integration exists, use a clearly marked fulfillment boundary.
 */

import type { AuthorizationRecord } from './human-review';
import type { ResponseDraft } from './draft-engine';

// ─── Fulfillment Types ────────────────────────────────────────────────────────

export type FulfillmentState =
  | 'pending'
  | 'submitted'
  | 'mailed'
  | 'failed'
  | 'boundary_reached';

export interface FulfillmentRequest {
  caseId: string;
  draft: ResponseDraft;
  recipientName: string;
  recipientAddress: string;
  agencyName: string;
  agencyAddress: string;
  idempotencyKey: string;
  authorizationRecord: AuthorizationRecord;
}

export interface FulfillmentResult {
  state: FulfillmentState;
  providerOrderId?: string;
  submittedAt?: string;
  error?: string;
  boundaryMessage?: string;
}

// ─── Fulfillment Adapter ─────────────────────────────────────────────────────

export async function fulfillRequest(request: FulfillmentRequest): Promise<FulfillmentResult> {
  // Check authorization
  if (request.authorizationRecord.state !== 'approved') {
    return {
      state: 'failed',
      error: 'Cannot fulfill without explicit human authorization.',
    };
  }

  // Check if MailMyPDF is configured
  const mailMyPdfUrl = process.env.MAILMYPDF_API_URL;
  const mailMyPdfKey = process.env.MAILMYPDF_API_KEY;

  if (!mailMyPdfUrl || !mailMyPdfKey) {
    return {
      state: 'boundary_reached',
      boundaryMessage: 'FULFILLMENT BOUNDARY: MailMyPDF is not configured. The document package has been prepared and approved, but physical mailing requires MailMyPDF integration. The approved draft is ready for manual mailing or for when MailMyPDF is connected.',
    };
  }

  // In production, this would call the MailMyPDF API
  // For now, return boundary reached with clear marking
  return {
    state: 'boundary_reached',
    boundaryMessage: 'FULFILLMENT BOUNDARY: MailMyPDF integration adapter is in place. To complete fulfillment, connect MailMyPDF credentials and activate the adapter.',
  };
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export type TrackingState =
  | 'not_submitted'
  | 'submitted'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'unknown';

export interface TrackingRecord {
  caseId: string;
  providerOrderId?: string;
  trackingNumber?: string;
  state: TrackingState;
  updatedAt: string;
  history: { timestamp: string; state: TrackingState; note?: string }[];
}

export function createTrackingRecord(caseId: string): TrackingRecord {
  return {
    caseId,
    state: 'not_submitted',
    updatedAt: new Date().toISOString(),
    history: [{ timestamp: new Date().toISOString(), state: 'not_submitted' }],
  };
}

export function updateTracking(
  record: TrackingRecord,
  newState: TrackingState,
  trackingNumber?: string,
  note?: string,
): TrackingRecord {
  return {
    ...record,
    state: newState,
    trackingNumber: trackingNumber || record.trackingNumber,
    updatedAt: new Date().toISOString(),
    history: [...record.history, { timestamp: new Date().toISOString(), state: newState, note }],
  };
}

// ─── Proof ─────────────────────────────────────────────────────────────────────

export interface ProofRecord {
  caseId: string;
  packetHash: string;
  documentManifest: { filename: string; hash: string; pages: number }[];
  timestamp: string;
  providerOrderId?: string;
  trackingNumber?: string;
  draftVersion: string;
  authorizedBy: string;
  authorizedAt: string;
}

export function generateProof(input: {
  caseId: string;
  draft: ResponseDraft;
  authorizedBy: string;
  authorizedAt: string;
  providerOrderId?: string;
  trackingNumber?: string;
}): ProofRecord {
  const manifest = [{
    filename: 'response-letter.txt',
    hash: simpleHash(input.draft.fullText),
    pages: Math.ceil(input.draft.fullText.length / 3000),
  }];

  return {
    caseId: input.caseId,
    packetHash: simpleHash(input.draft.fullText + input.authorizedBy + input.authorizedAt),
    documentManifest: manifest,
    timestamp: new Date().toISOString(),
    providerOrderId: input.providerOrderId,
    trackingNumber: input.trackingNumber,
    draftVersion: input.draft.draftVersion,
    authorizedBy: input.authorizedBy,
    authorizedAt: input.authorizedAt,
  };
}

function simpleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
