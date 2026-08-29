import type { MailingMethod, MailingRecipient } from "./mailing";

/**
 * Durable mailing intent record — the authoritative idempotency outbox.
 *
 * Before calling the MailMyPDF provider, the fulfillment service claims a
 * pending intent row. If a submitted intent already exists for the same
 * (idempotency_key, owner_id), the cached result is returned without
 * calling the provider. If a pending intent exists, the duplicate request
 * is rejected. If a failed intent exists, it is reclaimed for retry.
 *
 * This replaces the in-process Map, which does not survive restarts, does
 * not work across server instances, and has a TOCTOU race between check
 * and set.
 */

export type MailingIntentStatus = "pending" | "submitted" | "failed" | "cancelled";

export interface MailingIntent {
  id: string;
  ownerId: string;
  workflowId: string;
  matterId: string | null;
  status: MailingIntentStatus;
  mailingMethod: string;
  draftHash: string;
  providerOrderId: string | null;
  trackingNumber: string | null;
  idempotencyKey: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimMailingIntentInput {
  ownerId: string;
  idempotencyKey: string;
  workflowId: string;
  matterId?: string;
  mailingMethod: MailingMethod;
  draftContent: string;
  draftHash: string;
  recipient: MailingRecipient;
  matterReference?: string;
  matterType: string;
  stripePaymentId: string;
}

export interface ClaimResult {
  /** The intent record (either newly created or existing). */
  intent: MailingIntent;
  /** true if this caller created a new pending intent and should proceed with provider submission. */
  isNew: boolean;
}

export interface MailingIntentRepository {
  /**
   * Claim or retrieve an idempotency slot.
   *
   * - No existing intent: creates a pending intent, returns { isNew: true }.
   * - Existing submitted intent: returns { isNew: false } with cached providerOrderId.
   * - Existing pending intent: throws "submission already in progress".
   * - Existing failed intent: reclaims it (updates to pending), returns { isNew: true }.
   */
  claim(input: ClaimMailingIntentInput): Promise<ClaimResult>;

  /** Mark a claimed intent as submitted with the provider's order ID. */
  markSubmitted(
    idempotencyKey: string,
    ownerId: string,
    providerOrderId: string,
    trackingNumber?: string,
  ): Promise<void>;

  /** Mark a claimed intent as failed so it can be retried later. */
  markFailed(
    idempotencyKey: string,
    ownerId: string,
    errorMessage: string,
  ): Promise<void>;
}

export class MailingIntentConflictError extends Error {
  constructor() {
    super("A submission for this idempotency key is already in progress.");
    this.name = "MailingIntentConflictError";
  }
}
