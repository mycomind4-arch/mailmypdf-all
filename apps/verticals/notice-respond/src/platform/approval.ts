/**
 * Notice Respond approval helpers.
 *
 * Re-exports the shared approval contract from @mailmypdf/payment-fulfillment.
 */

export {
  sha256,
  hashDraft,
  hashRecipient,
  verifyIntegrity,
  type MailingIntent,
  type MailingRecipient,
} from "@/platform/payment-fulfillment";
