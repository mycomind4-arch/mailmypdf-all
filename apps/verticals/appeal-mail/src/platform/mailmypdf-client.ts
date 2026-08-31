/**
 * MailMyPDFClient adapter — bridges the shared @mailmypdf/mailing-client
 * HTTP client to the narrower MailMyPDFClient contract required by
 * @mailmypdf/payment-fulfillment's canonical fulfillment engine.
 */
import { createMailingClient } from "@mailmypdf/mailing-client";
import type { MailMyPDFClient } from "@mailmypdf/payment-fulfillment";

const client = createMailingClient("appeal-mail");

export const mailMyPDFClient: MailMyPDFClient = {
  async uploadDocument(content, filename, mimeType) {
    const file = new File([content], filename, { type: mimeType });
    const doc = await client.uploadDocument(file);
    return { id: doc.id };
  },

  async createCommunication(params) {
    const comm = await client.createCommunication({
      document_id: params.document_id,
      recipient: {
        name: params.recipient.name,
        address_line1: params.recipient.address1,
        address_line2: params.recipient.address2 ?? null,
        city: params.recipient.city,
        state: params.recipient.state.toUpperCase(),
        postal_code: params.recipient.zip,
        country: params.recipient.country || "US",
      },
      mail_type: params.mail_type,
      matter_reference: params.matter_reference,
      matter_type: params.matter_type,
      legal_reference: params.legal_reference,
      metadata: params.metadata,
      idempotency_key: params.idempotency_key,
    });
    return { id: comm.id, tracking_number: comm.tracking_number, status: comm.status };
  },
};
