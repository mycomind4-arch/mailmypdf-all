/**
 * Notice Respond adapter for @mailmypdf/payment-fulfillment.
 * Bridges the shared contract to Notice Respond's Supabase schema and the
 * shared MailMyPDF HTTP client.
 */
import { createClient } from "@supabase/supabase-js";
import { uploadDocument, createCommunication } from "@mailmypdf/mailing-client";
import type {
  MailingIntent,
  MailingIntentStore,
  MailMyPDFClient,
  MailingRecipient,
  MailType,
  LegalReference,
} from "@mailmypdf/payment-fulfillment";
import { handleStripeWebhookEvent, fulfillFromBrowserReturn, fulfillMailingIntent, verifyIntegrity, hashDraft, hashRecipient, sha256 } from "@mailmypdf/payment-fulfillment";

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function rowToIntent(row: Record<string, unknown>): MailingIntent {
  return {
    id: row.id as string,
    owner_id: (row.owner_id as string) ?? (row.user_id as string),
    workflow_id: row.workflow_id as string,
    case_id: (row.case_id as string) ?? null,
    approval_id: (row.approval_id as string) ?? null,
    draft_content: (row.draft_content as string) ?? (row.draft as string),
    recipient: row.recipient as MailingRecipient,
    mailing_method: row.mailing_method as MailType,
    matter_reference: row.matter_reference as string | undefined,
    matter_type: row.matter_type as string | undefined,
    legal_reference: row.legal_reference as LegalReference | undefined,
    approved_draft_hash: (row.approved_draft_hash as string) ?? (row.draft_hash as string) ?? null,
    approved_recipient_hash: (row.approved_recipient_hash as string) ?? (row.recipient_hash as string) ?? null,
    stripe_session_id: (row.stripe_session_id as string) ?? null,
    stripe_payment_intent_id: (row.stripe_payment_intent_id as string) ?? null,
    stripe_price_cents: (row.stripe_price_cents as number) ?? null,
    status: row.status as MailingIntent["status"],
    provider_order_id: (row.provider_order_id as string) ?? null,
    tracking_number: (row.tracking_number as string) ?? null,
    error_message: (row.error_message as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function createSupabaseIntentStore(): MailingIntentStore {
  const supabase = serviceSupabase();
  return {
    async load(intentId) {
      const { data, error } = await supabase.from("mailing_intents").select("*").eq("id", intentId).single();
      return error || !data ? null : rowToIntent(data as Record<string, unknown>);
    },
    async loadByStripeSession(sessionId) {
      const { data, error } = await supabase.from("mailing_intents").select("*").eq("stripe_session_id", sessionId).single();
      return error || !data ? null : rowToIntent(data as Record<string, unknown>);
    },
    async updateStatus(intentId, update) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (update.status !== undefined) updateData.status = update.status;
      if (update.stripe_session_id !== undefined) updateData.stripe_session_id = update.stripe_session_id;
      if (update.stripe_payment_intent_id !== undefined) updateData.stripe_payment_intent_id = update.stripe_payment_intent_id;
      if (update.provider_order_id !== undefined) updateData.provider_order_id = update.provider_order_id;
      if (update.tracking_number !== undefined) updateData.tracking_number = update.tracking_number;
      if (update.error_message !== undefined) updateData.error_message = update.error_message;
      await supabase.from("mailing_intents").update(updateData).eq("id", intentId);
    },
  };
}

export function createMailMyPDFClient(): MailMyPDFClient {
  return {
    async uploadDocument(content, filename, mimeType) {
      const file = new File([content], filename, { type: mimeType });
      const doc = await uploadDocument(file);
      return { id: doc.id };
    },
    async createCommunication(params) {
      const comm = await createCommunication({
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
}

export { handleStripeWebhookEvent, fulfillFromBrowserReturn, fulfillMailingIntent, verifyIntegrity, hashDraft, hashRecipient, sha256 };
