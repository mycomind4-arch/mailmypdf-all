import type { MailingOrderDraft, MailingProvider, MailingStatus } from "@/domain/mailing";
import {
  createCommunication,
  getCommunication,
  type CreateCommunicationInput,
  type MailType,
} from "./mailmypdf";

function mapMailType(method: MailingOrderDraft["method"]): MailType {
  switch (method) {
    case "certified":
      return "certified";
    case "registered":
      return "registered";
    default:
      return "first_class";
  }
}

export function mapStatus(status: unknown): MailingStatus["state"] {
  switch (status) {
    case "created":
    case "submitted":
      return "submitted";
    case "mailed":
    case "sent":
      return "mailed";
    case "in_transit":
    case "in-transit":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "refunded":
      return "refunded";
    default:
      throw new Error(`Unknown MailMyPDF fulfillment status: ${String(status)}`);
  }
}

export class MailMyPDFProvider implements MailingProvider {
  async createLetter(
    input: MailingOrderDraft,
  ): Promise<{ providerOrderId: string }> {
    if (!input.documentId)
      throw new Error("MailMyPDF submission requires a documentId");
    const idempotencyKey =
      input.idempotencyKey ?? `${input.workflowId}:${input.documentId}`;
    if (!idempotencyKey.trim())
      throw new Error("MailMyPDF submission requires a non-empty idempotency key");

    const communicationInput: CreateCommunicationInput = {
      document_id: input.documentId,
      recipient: {
        name: input.recipient.name,
        address_line1: input.recipient.address1,
        address_line2: input.recipient.address2 ?? null,
        city: input.recipient.city,
        state: input.recipient.state,
        postal_code: input.recipient.postalCode,
        country: "US",
      },
      mail_type: mapMailType(input.method),
      matter_reference: input.matterReference ?? input.workflowId,
      matter_type: input.matterType ?? "private-office",
      metadata: {
        workflow_id: input.workflowId,
        stripe_payment_id: input.stripePaymentId ?? null,
        ...(input.metadata ?? {}),
      },
      idempotency_key: idempotencyKey,
    };

    const communication = await createCommunication(communicationInput);
    if (!communication.id?.trim())
      throw new Error("MailMyPDF returned no provider order ID");
    return { providerOrderId: communication.id };
  }

  async getStatus(providerOrderId: string): Promise<MailingStatus> {
    if (!providerOrderId.trim())
      throw new Error("Provider order ID is required");
    const communication = await getCommunication(providerOrderId);
    const updatedAt =
      typeof communication.updated_at === "string"
        ? communication.updated_at
        : new Date().toISOString();
    return {
      state: mapStatus(communication.status),
      trackingNumber:
        typeof communication.tracking_number === "string"
          ? communication.tracking_number
          : undefined,
      updatedAt,
    };
  }
}

export const mailMyPDFProvider = new MailMyPDFProvider();
