import type { PlatformId } from "@mailmypdf/core";

export type MailingClass = "standard" | "certified" | "registered";

export interface MailingRequest {
  id: PlatformId;
  recipient: { name: string; address: string };
  documentId: PlatformId;
  mailingClass: MailingClass;
  scheduledFor?: string;
}

/** Canonical internal provider status vocabulary. */
export type CanonicalMailingStatus =
  | "draft"
  | "paid"
  | "submitted"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled"
  | "refunded";

/**
 * Existing public fulfillment type retained for compatibility with callers
 * that use the package's historical hyphenated in-transit state.
 */
export interface MailingStatus {
  id: PlatformId;
  state: "draft" | "scheduled" | "submitted" | "in-transit" | "delivered" | "failed" | "cancelled";
  trackingNumber?: string;
  updatedAt: string;
}

/**
 * Canonical provider status normalization for MailMyPDF communication
 * responses. Unknown provider values fail closed rather than being silently
 * mapped into a misleading successful state.
 */
export function normalizeMailMyPDFStatus(status: unknown): CanonicalMailingStatus {
  switch (status) {
    case "created":
    case "submitted": return "submitted";
    case "mailed":
    case "sent": return "mailed";
    case "in_transit":
    case "in-transit": return "in_transit";
    case "delivered": return "delivered";
    case "failed": return "failed";
    case "cancelled":
    case "canceled": return "cancelled";
    case "refunded": return "refunded";
    default: throw new Error(`Unknown MailMyPDF fulfillment status: ${String(status)}`);
  }
}

export interface MailMyPdfFulfillmentClient {
  createMailing(request: MailingRequest): Promise<MailingStatus>;
  getMailing(id: PlatformId): Promise<MailingStatus>;
}
