import type { MailingOrderDraft, MailingProvider, MailingStatus } from "@/domain/mailing";
import { normalizeMailMyPDFStatus } from "@mailmypdf/fulfillment";
import {
  createCommunication,
  getCommunication,
  type CreateImmigrationCommunicationInput,
  type MailType,
} from "./mailmypdf";

function mapMailType(method: MailingOrderDraft["method"]): MailType {
  switch (method) {
    case "certified": return "certified";
    case "registered": return "registered";
    default: return "first_class";
  }
}

export class MailMyPDFProvider implements MailingProvider {
  async createLetter(input: MailingOrderDraft): Promise<{ providerOrderId: string }> {
    if (!input.documentId) throw new Error("MailMyPDF submission requires a documentId");

    const idempotencyKey = input.idempotencyKey ?? `${input.workflowId}:${input.documentId}`;
    const communicationInput: CreateImmigrationCommunicationInput = {
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
      matter_type: input.matterType ?? "immigration-mail",
      legal_reference: input.legalReference
        ? {
            type: input.legalReference.type,
            citation: input.legalReference.citation,
            description: input.legalReference.description,
            response_window_days: input.legalReference.responseWindowDays ?? null,
            notes: input.legalReference.notes,
          }
        : {
            type: "other",
            citation: "Immigration Mail workflow",
            description: "Customer correspondence prepared through Immigration Mail.",
            response_window_days: null,
          },
      metadata: {
        workflow_id: input.workflowId,
        stripe_payment_id: input.stripePaymentId ?? null,
        ...(input.metadata ?? {}),
      },
      idempotency_key: idempotencyKey,
    };

    const communication = await createCommunication(communicationInput);
    return { providerOrderId: communication.id };
  }

  async getStatus(providerOrderId: string): Promise<MailingStatus> {
    const communication = await getCommunication(providerOrderId);
    return {
      state: normalizeMailMyPDFStatus(communication.status),
      trackingNumber: typeof communication.tracking_number === "string"
        ? communication.tracking_number
        : undefined,
      updatedAt: typeof communication.updated_at === "string"
        ? communication.updated_at
        : new Date().toISOString(),
    };
  }
}

export const mailMyPDFProvider = new MailMyPDFProvider();
