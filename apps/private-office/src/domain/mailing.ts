export type MailingMethod = "standard" | "certified" | "registered";

export interface MailingRecipient {
  name: string;
  organization?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface MailingOrderDraft {
  workflowId: string;
  documentId?: string;
  recipient: MailingRecipient;
  method: MailingMethod;
  stripePaymentId?: string;
  providerOrderId?: string;
  idempotencyKey?: string;
  matterReference?: string;
  matterType?: string;
  metadata?: Record<string, unknown>;
}

export interface MailingStatus {
  state:
    | "draft"
    | "paid"
    | "submitted"
    | "mailed"
    | "in_transit"
    | "delivered"
    | "failed"
    | "cancelled"
    | "refunded";
  trackingNumber?: string;
  updatedAt: string;
}

export interface MailingProvider {
  createLetter(input: MailingOrderDraft): Promise<{ providerOrderId: string }>;
  getStatus(providerOrderId: string): Promise<MailingStatus>;
}
