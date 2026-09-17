import {
  providerConfirmedActualSentAt,
  type MailingClass,
  type ProviderFulfillmentEvent,
} from "@mailmypdf/fulfillment";
import { recordRecordsRequestSent } from "./tracking.js";
import type {
  RecordsRequestDeliveryMethod,
  RecordsRequestTrackingResult,
} from "./types.js";

export function recordsRequestDeliveryMethodForMailClass(
  mailingClass: MailingClass,
): RecordsRequestDeliveryMethod {
  switch (mailingClass) {
    case "standard": return "first_class_mail";
    case "certified": return "certified_mail";
    case "registered": return "registered_mail";
  }
}

/**
 * Bridge canonical provider fulfillment into Records Request tracking.
 *
 * This intentionally refuses to create `records_request_sent` from checkout,
 * payment, submission, rendering, processing, or print timestamps. The event
 * is created only when the canonical fulfillment event carries an explicit
 * provider-confirmed `actualSentAt` value.
 */
export function recordRecordsRequestSentFromFulfillment(input: {
  event: ProviderFulfillmentEvent;
  mailingClass: MailingClass;
}): RecordsRequestTrackingResult {
  let actualSentAt: string | null;
  try {
    actualSentAt = providerConfirmedActualSentAt(input.event);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid fulfillment event.",
    };
  }

  if (!actualSentAt) {
    return {
      ok: false,
      error:
        "A provider-confirmed actual send timestamp is required before records-request response tracking can begin.",
    };
  }

  return recordRecordsRequestSent({
    sentDate: actualSentAt.slice(0, 10),
    method: recordsRequestDeliveryMethodForMailClass(input.mailingClass),
    providerId: input.event.providerOrderId,
    trackingNumber: input.event.trackingNumber ?? undefined,
    receiptArtifactId: input.event.proofArtifactId ?? undefined,
  });
}
