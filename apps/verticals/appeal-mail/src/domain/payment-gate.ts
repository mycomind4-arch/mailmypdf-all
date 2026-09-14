/**
 * The paid-draft gate separates a customer's purchase from an irreversible
 * mailing.  A paid case may be drafted and reviewed, but it cannot be mailed
 * until the customer explicitly approves the final artifact.
 */
export type PaymentGateStatus =
  | "checkout_open"
  | "paid"
  | "draft_ready"
  | "approved"
  | "submitted"
  | "expired"
  | "refunded";

export function canGenerateFinalDraft(status: PaymentGateStatus | null | undefined) {
  return status === "paid" || status === "draft_ready";
}

export function canRevealFinalDocument(status: PaymentGateStatus | null | undefined) {
  return status === "draft_ready" || status === "approved" || status === "submitted";
}

export function canSubmitForMailing(status: PaymentGateStatus | null | undefined) {
  return status === "approved";
}

export function nextPaymentGateStatus(
  current: PaymentGateStatus,
  event: "payment_confirmed" | "draft_generated" | "customer_approved" | "mail_submitted" | "checkout_expired" | "payment_refunded",
): PaymentGateStatus | null {
  const transitions: Record<PaymentGateStatus, Partial<Record<typeof event, PaymentGateStatus>>> = {
    checkout_open: { payment_confirmed: "paid", checkout_expired: "expired" },
    paid: { draft_generated: "draft_ready", payment_refunded: "refunded" },
    draft_ready: { customer_approved: "approved", payment_refunded: "refunded" },
    approved: { mail_submitted: "submitted", payment_refunded: "refunded" },
    submitted: {},
    expired: {},
    refunded: {},
  };
  return transitions[current][event] ?? null;
}
