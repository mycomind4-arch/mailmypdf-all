import type { CanonicalMailingStatus } from "./index.js";

/**
 * Provider-confirmed fulfillment event shared by all workflow families.
 *
 * `occurredAt` is when the provider event was observed/recorded. It is NOT a
 * substitute for `actualSentAt`. Response clocks and other legal/business
 * timing must only use `actualSentAt` when the provider explicitly confirms
 * the real mailing timestamp/date.
 */
export interface ProviderFulfillmentEvent {
  providerOrderId: string;
  status: CanonicalMailingStatus;
  occurredAt: string;
  providerEventId?: string | null;
  trackingNumber?: string | null;
  actualSentAt?: string | null;
  deliveredAt?: string | null;
  proofArtifactId?: string | null;
}

const SENT_CONFIRMING_STATUSES = new Set<CanonicalMailingStatus>([
  "mailed",
  "in_transit",
  "delivered",
  "returned",
  "undeliverable",
  "refused",
]);

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

export function isProviderConfirmedSentStatus(status: CanonicalMailingStatus): boolean {
  return SENT_CONFIRMING_STATUSES.has(status);
}

/**
 * Validate and normalize a provider event without inferring consequential
 * timestamps. In particular, `occurredAt`, checkout time, payment time, print
 * time, and submission time can never be promoted to `actualSentAt`.
 */
export function createProviderFulfillmentEvent(
  input: ProviderFulfillmentEvent,
): ProviderFulfillmentEvent {
  if (!input.providerOrderId.trim()) {
    throw new Error("Provider fulfillment event requires providerOrderId");
  }
  if (!isIsoTimestamp(input.occurredAt)) {
    throw new Error("Provider fulfillment event requires a valid occurredAt timestamp");
  }

  if (input.actualSentAt != null) {
    if (!isIsoTimestamp(input.actualSentAt)) {
      throw new Error("Provider-confirmed actualSentAt must be a valid timestamp");
    }
    if (!isProviderConfirmedSentStatus(input.status)) {
      throw new Error(`${input.status} does not confirm that the mailing was actually sent`);
    }
  }

  if (input.deliveredAt != null) {
    if (!isIsoTimestamp(input.deliveredAt)) {
      throw new Error("Provider-confirmed deliveredAt must be a valid timestamp");
    }
    if (input.status !== "delivered") {
      throw new Error("deliveredAt may only be recorded for delivered mail");
    }
  }

  return {
    ...input,
    providerOrderId: input.providerOrderId.trim(),
    providerEventId: input.providerEventId?.trim() || null,
    trackingNumber: input.trackingNumber?.trim() || null,
    actualSentAt: input.actualSentAt ?? null,
    deliveredAt: input.deliveredAt ?? null,
    proofArtifactId: input.proofArtifactId?.trim() || null,
  };
}

/**
 * Return the real provider-confirmed send timestamp, or null when no such
 * confirmation exists. This intentionally never falls back to `occurredAt`.
 */
export function providerConfirmedActualSentAt(
  event: ProviderFulfillmentEvent,
): string | null {
  const normalized = createProviderFulfillmentEvent(event);
  if (!normalized.actualSentAt || !isProviderConfirmedSentStatus(normalized.status)) {
    return null;
  }
  return normalized.actualSentAt;
}
