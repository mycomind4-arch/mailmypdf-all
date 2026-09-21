/** Presentation only. Payment and fulfillment authority stay on the server. */
export interface MailingStatusView {
  label: string;
  message: string;
  needsAttention: boolean;
  paymentConfirmed: boolean;
  awaitingPayment: boolean;
  inTransit: boolean;
}

export function mailingStatus(status: string): MailingStatusView {
  const base = {
    needsAttention: false,
    paymentConfirmed: false,
    awaitingPayment: false,
    inTransit: false,
  };
  switch (status) {
    case "draft":
    case "checkout_created":
      return {
        ...base,
        label: "Awaiting payment",
        message:
          "Payment has not been confirmed. If you just paid, allow a moment for confirmation. Do not pay again while checking.",
        awaitingPayment: true,
      };
    case "paid":
    case "paid_pending_manual_fulfillment":
      return {
        ...base,
        label: "Payment received",
        message:
          "Your mailing is waiting for fulfillment. It has not been confirmed mailed yet.",
        paymentConfirmed: true,
      };
    case "manual_fulfillment_in_progress":
      return {
        ...base,
        label: "Preparing your mailing",
        message:
          "Your mailing is being prepared. No mailing confirmation has been recorded yet.",
        paymentConfirmed: true,
      };
    case "submitted_to_provider":
    case "provider_processing":
      return {
        ...base,
        label: "With the mail provider",
        message:
          "The provider is preparing your mailing. Submission is not confirmation that it has been mailed.",
        paymentConfirmed: true,
      };
    case "mailed":
    case "in_transit":
      return {
        ...base,
        label: status === "mailed" ? "Mailed" : "In transit",
        message:
          "Your mailing has been reported mailed. Delivery has not been confirmed.",
        paymentConfirmed: true,
        inTransit: true,
      };
    case "delivered":
      return {
        ...base,
        label: "Delivery reported",
        message:
          "Delivery was reported. This does not establish that the recipient read the document.",
        paymentConfirmed: true,
      };
    case "returned":
      return {
        ...base,
        label: "Returned to sender",
        message:
          "The mailing was reported returned. Contact support before attempting another mailing.",
        paymentConfirmed: true,
        needsAttention: true,
      };
    case "refunded":
      return {
        ...base,
        label: "Refund recorded",
        message:
          "A refund was recorded. This does not establish whether a previously submitted mailing was stopped.",
        paymentConfirmed: true,
      };
    case "cancelled":
      return {
        ...base,
        label: "Cancelled",
        message:
          "This order was cancelled. Cancellation alone does not confirm a refund or recall of mail already submitted.",
      };
    case "failed_payment":
      return {
        ...base,
        label: "Payment needs attention",
        message:
          "Payment failed. Check with support before retrying if a charge appears on your statement.",
        needsAttention: true,
      };
    case "failed_fulfillment":
    case "failed_provider_submission":
    case "failed":
      return {
        ...base,
        label: "Mailing needs attention",
        message:
          "We could not complete the mailing normally. Contact support with this order number; do not pay or submit again until its status is resolved.",
        needsAttention: true,
      };
    default:
      return {
        ...base,
        label: "Status needs verification",
        message:
          "We cannot interpret the recorded status. Contact support before taking another payment or mailing action.",
        needsAttention: true,
      };
  }
}
