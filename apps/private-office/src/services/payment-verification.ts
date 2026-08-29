/**
 * Payment verification service.
 *
 * Derives `paymentVerified` and `stripePaymentId` from PaymentEvidence
 * for the fulfillment authorization boundary.
 *
 * This is the ONLY path through which `paymentVerified` is derived.
 * The fulfillment service receives these values as inputs — it does
 * not independently verify payment.
 *
 * CRITICAL: A verified payment does NOT authorize mailing. It is only
 * one of six gates in `canAuthorizeMatterMail`. The other five gates
 * (analysis, draft hash, human approval, recipient, idempotency)
 * remain independent and untouched.
 */

import {
  type PaymentEvidenceRepository,
} from "@/domain/payment-evidence";

export interface PaymentVerificationResult {
  paymentVerified: boolean;
  stripePaymentId: string;
}

/**
 * Derive payment verification status from PaymentEvidence.
 *
 * Returns `paymentVerified: true` only when a verified PaymentEvidence
 * record exists for the given owner and matter. Returns `false` and
 * an empty string when no evidence exists or the evidence is not verified.
 */
export async function verifyPaymentForFulfillment(
  ownerId: string,
  matterId: string,
  repository: PaymentEvidenceRepository,
): Promise<PaymentVerificationResult> {
  const evidence = await repository.findByMatter(ownerId, matterId);

  if (!evidence) {
    return { paymentVerified: false, stripePaymentId: "" };
  }

  if (evidence.status !== "verified") {
    return { paymentVerified: false, stripePaymentId: "" };
  }

  return {
    paymentVerified: true,
    stripePaymentId: evidence.stripePaymentIntentId,
  };
}
