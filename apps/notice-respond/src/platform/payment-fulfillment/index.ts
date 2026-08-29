/**
 * @mailmypdf/payment-fulfillment
 *
 * The canonical payment → intent → approved-artifact → fulfillment contract.
 *
 * Every vertical that accepts payment and mails a physical document must
 * implement this contract. The contract enforces:
 *
 * 1. The client never controls recipient, price, or draft content at mailing time.
 * 2. The server loads an immutable approved artifact (identified by ID only).
 * 3. SHA-256 hashes verify the stored draft and recipient match what was approved.
 * 4. Fulfillment is idempotent — the first path (webhook or browser) to complete wins.
 * 5. Stripe webhooks drive fulfillment server-to-server; browser return is a fallback.
 *
 * This package provides the types, the fulfillment engine, and the Stripe
 * webhook handler factory. Verticals supply their own MailingIntentStore
 * and MailMyPDF client adapter.
 */

import { createHash } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────────

export type MailType = "first_class" | "certified" | "certified_return_receipt" | "registered";

export type MailingIntentStatus =
  | "draft"
  | "approved"
  | "paid"
  | "submitted"
  | "tracking"
  | "delivered"
  | "failed"
  | "expired"
  | "refunded";

export type FulfillmentSource = "stripe-webhook" | "browser-return";

/**
 * The durable record of what was approved and should be mailed.
 * Created at approval time. The draft_content and recipient are
 * immutable after creation — the client cannot modify them.
 */
export interface MailingIntent {
  id: string;
  owner_id: string;
  workflow_id: string;
  case_id?: string | null;
  approval_id?: string | null;

  // Immutable content (set at approval time)
  draft_content: string;
  recipient: MailingRecipient;
  mailing_method: MailType;
  matter_reference?: string;
  matter_type?: string;
  legal_reference?: LegalReference;

  // Approval hashes (SHA-256, computed at approval time)
  approved_draft_hash?: string | null;
  approved_recipient_hash?: string | null;

  // Payment state
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_price_cents?: number | null;

  // Fulfillment state
  status: MailingIntentStatus;
  provider_order_id?: string | null;
  tracking_number?: string | null;
  error_message?: string | null;

  created_at: string;
  updated_at: string;
}

export interface MailingRecipient {
  name: string;
  org?: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface LegalReference {
  type: "statute" | "lease_clause" | "contract_term" | "regulation" | "ordinance" | "other";
  citation: string;
  description: string;
  response_window_days?: number | null;
  notes?: string;
}

/**
 * Verticals implement this to load and update their mailing intents.
 * This is the integration boundary — the vertical owns its database.
 */
export interface MailingIntentStore {
  load(intentId: string): Promise<MailingIntent | null>;
  loadByStripeSession(sessionId: string): Promise<MailingIntent | null>;
  updateStatus(
    intentId: string,
    update: Partial<Pick<MailingIntent,
      "status" | "stripe_session_id" | "stripe_payment_intent_id"
      | "provider_order_id" | "tracking_number" | "error_message"
    >>,
  ): Promise<void>;
}

/**
 * Verticals implement this to talk to MailMyPDF's document/communication API.
 */
export interface MailMyPDFClient {
  uploadDocument(content: string, filename: string, mimeType: string): Promise<{ id: string }>;
  createCommunication(params: {
    document_id: string;
    recipient: MailingRecipient;
    mail_type: MailType;
    matter_reference: string;
    matter_type: string;
    legal_reference: LegalReference;
    metadata: Record<string, unknown>;
    idempotency_key: string;
  }): Promise<{ id: string; tracking_number?: string; status?: string }>;
}

// ── Hashing ─────────────────────────────────────────────────────────────────

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hashRecipient(recipient: MailingRecipient): string {
  const canonical = JSON.stringify({
    name: recipient.name.trim().toUpperCase(),
    org: (recipient.org || "").trim().toUpperCase(),
    address1: recipient.address1.trim().toUpperCase(),
    address2: (recipient.address2 || "").trim().toUpperCase(),
    city: recipient.city.trim().toUpperCase(),
    state: recipient.state.trim().toUpperCase(),
    zip: recipient.zip.trim(),
  });
  return sha256(canonical);
}

export function hashDraft(draftContent: string): string {
  return sha256(draftContent);
}

// ── Integrity Verification ──────────────────────────────────────────────────

export interface IntegrityCheckResult {
  ok: boolean;
  error?: string;
}

export function verifyIntegrity(intent: MailingIntent): IntegrityCheckResult {
  // Verify draft hash
  if (intent.approved_draft_hash) {
    const computed = hashDraft(intent.draft_content);
    if (computed !== intent.approved_draft_hash) {
      return { ok: false, error: "Integrity check failed: the stored draft does not match the approved draft." };
    }
  }

  // Verify recipient hash
  if (intent.approved_recipient_hash) {
    const computed = hashRecipient(intent.recipient);
    if (computed !== intent.approved_recipient_hash) {
      return { ok: false, error: "Integrity check failed: the stored recipient does not match the approved recipient." };
    }
  }

  // Validate recipient completeness
  const r = intent.recipient;
  if (!r.name || !r.address1 || !r.city || !r.state || !r.zip) {
    return { ok: false, error: "Stored recipient is incomplete." };
  }

  return { ok: true };
}

// ── Fulfillment Engine ──────────────────────────────────────────────────────

export interface FulfillmentResult {
  success: boolean;
  providerOrderId?: string;
  trackingNumber?: string | null;
  status?: string;
  error?: string;
  idempotent?: boolean;
}

const ALLOWED_MAIL_TYPES = new Set<MailType>([
  "first_class", "certified", "certified_return_receipt", "registered",
]);

/**
 * Fulfill a mailing intent. This is the single canonical fulfillment path.
 * Both the Stripe webhook and the browser-return path call this function.
 *
 * Idempotent: if the intent already has a provider_order_id, returns immediately.
 */
export async function fulfillMailingIntent(
  store: MailingIntentStore,
  client: MailMyPDFClient,
  intentId: string,
  sessionId: string,
  paymentIntentId: string | null,
  source: FulfillmentSource,
  verticalName: string,
): Promise<FulfillmentResult> {
  const intent = await store.load(intentId);
  if (!intent) {
    return { success: false, error: `Mailing intent not found: ${intentId}` };
  }

  // ── Idempotency: already fulfilled ────────────────────────
  if (intent.provider_order_id) {
    return {
      success: true,
      providerOrderId: intent.provider_order_id,
      trackingNumber: intent.tracking_number ?? null,
      status: intent.status,
      idempotent: true,
    };
  }

  if (intent.status === "submitted" || intent.status === "tracking") {
    return { success: true, status: intent.status, idempotent: true };
  }

  // ── Verify session matches ────────────────────────────────
  if (intent.stripe_session_id && intent.stripe_session_id !== sessionId) {
    return { success: false, error: "Stripe session does not match the stored intent." };
  }

  // ── Validate mailing method ───────────────────────────────
  if (!ALLOWED_MAIL_TYPES.has(intent.mailing_method)) {
    return { success: false, error: "Stored mailing method is invalid." };
  }

  // ── ★ Integrity verification ──────────────────────────────
  const integrity = verifyIntegrity(intent);
  if (!integrity.ok) {
    return { success: false, error: integrity.error };
  }

  // ── Mark as paid ───────────────────────────────────────────
  await store.updateStatus(intentId, {
    status: "paid",
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
  });

  // ── Submit to MailMyPDF ────────────────────────────────────
  try {
    const filename = `${verticalName}-${intent.workflow_id}-${intent.id}.txt`;
    const document = await client.uploadDocument(intent.draft_content, filename, "text/plain");

    const communication = await client.createCommunication({
      document_id: document.id,
      recipient: intent.recipient,
      mail_type: intent.mailing_method,
      matter_reference: intent.matter_reference || intent.workflow_id,
      matter_type: intent.matter_type || verticalName,
      legal_reference: intent.legal_reference || {
        type: "other",
        citation: `${verticalName} workflow`,
        description: `Correspondence prepared through ${verticalName}.`,
      },
      metadata: {
        workflow_id: intent.workflow_id,
        source: verticalName,
        stripe_session_id: sessionId,
        owner_user_id: intent.owner_id,
        approval_id: intent.approval_id || null,
        approved_draft_hash: intent.approved_draft_hash || null,
        fulfillment_source: source,
      },
      idempotency_key: `stripe:${sessionId}`,
    });

    await store.updateStatus(intentId, {
      status: "submitted",
      provider_order_id: communication.id,
      tracking_number: communication.tracking_number ?? null,
      error_message: null,
    });

    return {
      success: true,
      providerOrderId: communication.id,
      trackingNumber: communication.tracking_number ?? null,
      status: communication.status ?? "submitted",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailing submission failed.";
    await store.updateStatus(intentId, {
      status: "failed",
      error_message: message,
    });
    return { success: false, error: message };
  }
}

// ── Stripe Webhook Handler Factory ──────────────────────────────────────────

/**
 * Creates a Stripe webhook event handler for a specific vertical.
 * Verticals call this from their Nitro/h3 webhook route.
 *
 * Usage (in server/api/webhooks/stripe.ts):
 *
 *   export default defineEventHandler(async (event) => {
 *     return handleStripeWebhook(event, {
 *       store: supabaseIntentStore,
 *       client: mailmypdfClient,
 *       verticalName: "immigration-mail",
 *     });
 *   });
 */
export interface StripeWebhookConfig {
  store: MailingIntentStore;
  client: MailMyPDFClient;
  verticalName: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      payment_status?: string;
      id?: string;
      metadata?: Record<string, string | undefined>;
      payment_intent?: string | { id: string };
    };
  };
}

export async function handleStripeWebhookEvent(
  stripeEvent: StripeWebhookEvent,
  config: StripeWebhookConfig,
): Promise<Record<string, unknown>> {
  const { store, client, verticalName } = config;

  // ── checkout.session.completed ────────────────────────────
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    if (session.payment_status !== "paid") {
      return { received: true, skipped: true, reason: `payment_status=${session.payment_status}` };
    }

    const intentId = session.metadata?.mailing_intent_id;
    if (!intentId) {
      return { received: true, skipped: true, reason: "no mailing_intent_id in metadata" };
    }

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    const result = await fulfillMailingIntent(
      store, client, intentId, session.id || "", paymentIntentId,
      "stripe-webhook", verticalName,
    );

    if (!result.success) {
      console.error(`[stripe-webhook:${verticalName}] Fulfillment failed for intent ${intentId}: ${result.error}`);
    }

    return { received: true, ...result, intentId };
  }

  // ── checkout.session.expired ──────────────────────────────
  if (stripeEvent.type === "checkout.session.expired") {
    const session = stripeEvent.data.object;
    const intentId = session.metadata?.mailing_intent_id;
    if (intentId) {
      await store.updateStatus(intentId, {
        status: "expired",
        error_message: "Stripe checkout session expired.",
      });
    }
    return { received: true, handled: "checkout.session.expired" };
  }

  // ── charge.refunded ───────────────────────────────────────
  if (stripeEvent.type === "charge.refunded") {
    const charge = stripeEvent.data.object;
    const intentId = charge.metadata?.mailing_intent_id;
    if (intentId) {
      await store.updateStatus(intentId, {
        status: "refunded",
        error_message: "Payment refunded by Stripe.",
      });
    }
    return { received: true, handled: "charge.refunded" };
  }

  return { received: true, unhandled: stripeEvent.type };
}

// ── Browser-Return Fulfillment ──────────────────────────────────────────────

/**
 * Fulfillment from the browser success-URL return path.
 * This is the fallback — the Stripe webhook is the primary path.
 * Both paths are idempotent; the first to complete wins.
 *
 * Verticals call this from their /api/mail/response endpoint after
 * verifying the user is authenticated and the session belongs to them.
 */
export async function fulfillFromBrowserReturn(
  store: MailingIntentStore,
  client: MailMyPDFClient,
  intentId: string,
  sessionId: string,
  paymentIntentId: string | null,
  verticalName: string,
): Promise<FulfillmentResult> {
  return fulfillMailingIntent(
    store, client, intentId, sessionId, paymentIntentId,
    "browser-return", verticalName,
  );
}
