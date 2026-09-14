/**
 * MailMyPDFClient adapter — bridges the shared @mailmypdf/mailing-client
 * HTTP client to the narrower MailMyPDFClient contract required by
 * @mailmypdf/payment-fulfillment's canonical fulfillment engine.
 */
import { createMailingClient } from "@mailmypdf/mailing-client";
import type { MailMyPDFClient } from "@mailmypdf/payment-fulfillment";
import { getSupabaseServer } from "./supabase";

const client = createMailingClient("appeal-mail");
const EVIDENCE_BUCKET = "appeal-evidence";

export const mailMyPDFClient: MailMyPDFClient = {
  async uploadDocument(content, filename, mimeType) {
    const file = new File([content], filename, { type: mimeType });
    const doc = await client.uploadDocument(file);
    return { id: doc.id };
  },

  // Mirrors Notice Respond's uploadPacket() (fulfillment-adapter.ts): fetch
  // each approved evidence item's bytes from our own Storage, verify the
  // hash frozen at approval time hasn't drifted, then merge everything into
  // one packet via the shared mailing-client (which uses the same
  // production packet-builder apps/mailmypdf's own API uses). Without this,
  // fulfillMailingIntent() falls back to uploadDocument() and mails the
  // letter alone — see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md,
  // "Second confirmed finding".
  async uploadPacket(intent, filename) {
    const approvedEvidence = intent.evidence_snapshot ?? [];
    const attachments: Array<{ filename: string; mime_type: string; data: Uint8Array }> = [];

    if (approvedEvidence.length > 0) {
      const supabase = await getSupabaseServer();
      for (const evidence of approvedEvidence) {
        if (!evidence.storagePath || !evidence.fileHash) {
          throw new Error("Approved evidence manifest is incomplete.");
        }

        const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).download(evidence.storagePath);
        if (error || !data) {
          throw new Error(`Unable to read approved evidence: ${evidence.fileName}`);
        }

        const bytes = new Uint8Array(await data.arrayBuffer());
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const actualHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        if (actualHash !== evidence.fileHash) {
          throw new Error(`Approved evidence failed integrity verification: ${evidence.fileName}`);
        }

        attachments.push({ filename: evidence.fileName, mime_type: evidence.fileType, data: bytes });
      }
    }

    const doc = await client.uploadPacket({ text: intent.draft_content, filename, attachments });
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
