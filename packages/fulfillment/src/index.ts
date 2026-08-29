import type { PlatformId } from "@mailmypdf/core";

export type MailingClass = "standard" | "certified" | "registered";

export interface MailingRequest {
  id: PlatformId;
  recipient: { name: string; address: string };
  documentId: PlatformId;
  mailingClass: MailingClass;
  scheduledFor?: string;
}

export interface MailingStatus {
  id: PlatformId;
  state: "draft" | "scheduled" | "submitted" | "in-transit" | "delivered" | "failed" | "cancelled";
  trackingNumber?: string;
  updatedAt: string;
}

export interface MailMyPdfFulfillmentClient {
  createMailing(request: MailingRequest): Promise<MailingStatus>;
  getMailing(id: PlatformId): Promise<MailingStatus>;
}
