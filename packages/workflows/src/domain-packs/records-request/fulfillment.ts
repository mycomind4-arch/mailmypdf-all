import { recordRecordsRequestSent } from "./tracking.js";
import type {
  RecordsRequestDeliveryMethod,
  RecordsRequestTrackingResult,
} from "./types.js";

/** Structurally compatible with the canonical @mailmypdf/fulfillment event. */
export interface RecordsRequestFulfillmentEvent {
  providerOrderId: string;
  status: string;
  occurredAt: string;
  providerEventId?: string | null;
  trackingNumber?: string | null;
  actualSentAt?: string | null;
  deliveredAt?: string | null;
  proofArtifactId?: string | null;
}

export type RecordsRequestMailingClass = "standard" | "certified" | "registered";

const SENT_CONFIRMING_STATUSES = new Set([
  "mailed",
  "in_transit",
  "delivered",
  "returned",
  "undeliverable",
  "refused",
]);

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function recordsRequestDeliveryMethodForMailClass(
  mailingClass: RecordsRequestMailingClass,
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
  event: RecordsRequestFulfillmentEvent;
  mailingClass: RecordsRequestMailingClass;
}): RecordsRequestTrackingResult {
  const { event } = input;
  if (!event.providerOrderId.trim()) {
    return { ok: false, error: "A provider order ID is required for fulfillment tracking." };
  }
  if (!isIsoTimestamp(event.occurredAt)) {
    return { ok: false, error: "A valid provider event timestamp is required." };
  }
  if (!event.actualSentAt) {
    return {
      ok: false,
      error:
        "A provider-confirmed actual send timestamp is required before records-request response tracking can begin.",
    };
  }
  if (!SENT_CONFIRMING_STATUSES.has(event.status)) {
    return {
      ok: false,
      error: `${event.status} does not confirm that the records request was actually sent.`,
    };
  }
  if (!isIsoTimestamp(event.actualSentAt)) {
    return { ok: false, error: "The provider-confirmed actual send timestamp is invalid." };
  }

  return recordRecordsRequestSent({
    sentDate: event.actualSentAt.slice(0, 10),
    method: recordsRequestDeliveryMethodForMailClass(input.mailingClass),
    providerId: event.providerOrderId,
    trackingNumber: event.trackingNumber ?? undefined,
    receiptArtifactId: event.proofArtifactId ?? undefined,
  });
}
