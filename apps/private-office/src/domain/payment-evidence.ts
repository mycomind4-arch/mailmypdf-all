/**
 * Payment evidence domain for Private Office.
 *
 * PaymentEvidence is the SINGLE SOURCE OF TRUTH for whether a payment
 * has been verified. The `paymentVerified` flag consumed by the
 * fulfillment authorization boundary is DERIVED from this record —
 * never from a client claim or a raw Stripe event alone.
 *
 * CRITICAL INVARIANTS:
 * - Payment is EVIDENCE, not AUTHORIZATION.
 * - A verified PaymentEvidence does not authorize mailing — it is
 *   only one of six gates in `canAuthorizeMatterMail`.
 * - PaymentEvidence status is set only by the server-side webhook
 *   handler after Stripe signature verification.
 * - A client can NEVER set `status: "verified"`.
 * - Failed or canceled payments must never become verified.
 * - Duplicate webhook delivery must be idempotent.
 */

import type { WorkflowId } from "./workflows";

export type PaymentEvidenceStatus = "pending" | "verified" | "failed";

export interface PaymentEvidence {
  id: string;
  ownerId: string;
  matterId: string;
  workflowId: WorkflowId;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentEvidenceStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentEvidenceInput {
  ownerId: string;
  matterId: string;
  workflowId: WorkflowId;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentEvidenceInput {
  stripePaymentIntentId: string;
  stripeSessionId: string;
}

export interface PaymentEvidenceRepository {
  /**
   * Create a pending payment evidence record.
   * Called during checkout creation (before payment is confirmed).
   */
  create(input: CreatePaymentEvidenceInput): Promise<PaymentEvidence>;

  /**
   * Find payment evidence by Stripe session ID.
   * Used by the webhook handler for idempotent processing.
   */
  findBySessionId(stripeSessionId: string): Promise<PaymentEvidence | null>;

  /**
   * Find payment evidence by matter and owner.
   * Used by the payment verification service to derive
   * `paymentVerified` for the fulfillment boundary.
   */
  findByMatter(ownerId: string, matterId: string): Promise<PaymentEvidence | null>;

  /**
   * Mark a payment evidence as verified.
   * Called ONLY by the webhook handler after Stripe confirms payment.
   * Idempotent: if already verified, returns the existing record.
   */
  markVerified(
    stripeSessionId: string,
    stripePaymentIntentId: string,
  ): Promise<PaymentEvidence>;

  /**
   * Mark a payment evidence as failed.
   * Called by the webhook handler on payment_intent.payment_failed.
   * Idempotent: if already failed, returns the existing record.
   * Must NOT overwrite a verified record.
   */
  markFailed(
    stripeSessionId: string,
    reason: string,
  ): Promise<PaymentEvidence>;
}

export class PaymentEvidenceError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "PaymentEvidenceError";
  }
}

export class PaymentEvidenceNotFoundError extends PaymentEvidenceError {
  constructor() {
    super("Payment evidence not found for the given matter.", "NOT_FOUND");
    this.name = "PaymentEvidenceNotFoundError";
  }
}

export class PaymentEvidenceAlreadyVerifiedError extends PaymentEvidenceError {
  constructor() {
    super(
      "Payment evidence is already verified and cannot be marked as failed.",
      "ALREADY_VERIFIED",
    );
    this.name = "PaymentEvidenceAlreadyVerifiedError";
  }
}
