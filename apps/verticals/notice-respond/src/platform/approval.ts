/**
 * Notice Respond approval compatibility shim.
 * Canonical hashing/integrity helpers live in @mailmypdf/payment-fulfillment.
 */
export {
  sha256,
  hashDraft,
  hashRecipient,
  verifyIntegrity,
  type MailingIntent,
  type MailingRecipient,
} from "@mailmypdf/payment-fulfillment";
