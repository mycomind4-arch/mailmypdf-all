/**
 * MailingIntentStore adapter — bridges Appeal Mail's `appeals` + `mailings`
 * Supabase tables to the MailingIntentStore contract required by
 * @mailmypdf/payment-fulfillment's canonical fulfillment engine.
 *
 * The intent id IS the appeal id. An appeal's assembled `packet` (built by
 * assemblePacket() at approval time, see domain/packet.ts) is the immutable
 * approved artifact: its approvedDraftHash / approvedRecipientHash let the
 * shared engine verify nothing drifted between approval and mailing. Any
 * appeal without a complete packet is reported as "no intent" — the engine
 * fails closed instead of silently skipping fulfillment.
 *
 * `mailings` is the durable, cross-app-compatible tracking record used for
 * idempotency (a provider_order_id there means "already mailed, do not
 * re-submit"). `appeals.status` / `appeals.proof` are mirrored on every
 * status change so the existing UI and domain invariants
 * (see domain/appeal.ts: canPersistMailedStatus) keep working unchanged.
 */
import { getSupabaseServer } from "./supabase";
import type { MailingIntent, MailingIntentStore, MailType } from "@mailmypdf/payment-fulfillment";

type SupabaseServer = Awaited<ReturnType<typeof getSupabaseServer>>;

function mapMailingMethodToMailType(method: string | undefined | null): MailType {
  switch (method) {
    case "certified": return "certified";
    case "registered": return "registered";
    default: return "first_class";
  }
}

function mapFulfillmentStatusToProofStatus(
  status: string,
): "assembled" | "mailed" | "in_transit" | "delivered" | "failed" {
  switch (status) {
    case "submitted":
    case "tracking": return "mailed";
    case "delivered": return "delivered";
    case "failed": return "failed";
    default: return "assembled";
  }
}

function mapFulfillmentStatusToAppealStatus(status: string, current: string): string {
  if (status === "delivered") return "delivered";
  if (status === "submitted" || status === "tracking") return "mailed";
  return current;
}

async function loadRows(supabase: SupabaseServer, appealId: string) {
  const { data: appeal, error } = await supabase.from("appeals").select("*").eq("id", appealId).single();
  if (error || !appeal) return null;
  const { data: mailing } = await supabase
    .from("mailings")
    .select("*")
    .eq("appeal_id", appealId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { appeal, mailing };
}

function rowsToIntent(appeal: Record<string, any>, mailing: Record<string, any> | null): MailingIntent | null {
  const packet = appeal.packet;
  if (
    !packet?.finalLetter?.trim() ||
    !packet.recipientName ||
    !packet.recipientAddress1 ||
    !packet.recipientCity ||
    !packet.recipientState ||
    !packet.recipientZip
  ) {
    // No approved artifact yet — there is nothing eligible to mail.
    return null;
  }

  return {
    id: appeal.id,
    owner_id: appeal.user_id,
    workflow_id: appeal.workflow_id,
    case_id: appeal.id,
    approval_id: null,
    draft_content: packet.finalLetter,
    recipient: {
      name: packet.recipientName,
      address1: packet.recipientAddress1,
      address2: packet.recipientAddress2 || null,
      city: packet.recipientCity,
      state: packet.recipientState,
      zip: packet.recipientZip,
      country: "US",
    },
    mailing_method: mapMailingMethodToMailType(packet.mailingMethod),
    matter_reference: appeal.decision?.referenceNumber || appeal.id,
    matter_type: appeal.workflow_id,
    approved_draft_hash: packet.approvedDraftHash ?? null,
    approved_recipient_hash: packet.approvedRecipientHash ?? null,
    stripe_session_id: mailing?.stripe_session_id ?? null,
    stripe_payment_intent_id: mailing?.stripe_payment_id ?? null,
    stripe_price_cents: null,
    status: (mailing?.status as MailingIntent["status"]) ?? "approved",
    provider_order_id: mailing?.provider_order_id ?? null,
    tracking_number: mailing?.tracking_number ?? null,
    error_message: mailing?.error_message ?? null,
    created_at: appeal.created_at,
    updated_at: appeal.updated_at,
  };
}

export function createAppealMailIntentStore(): MailingIntentStore {
  return {
    async load(intentId) {
      const supabase = await getSupabaseServer();
      const rows = await loadRows(supabase, intentId);
      if (!rows) return null;
      return rowsToIntent(rows.appeal, rows.mailing ?? null);
    },

    async loadByStripeSession(sessionId) {
      const supabase = await getSupabaseServer();
      const { data: mailing } = await supabase
        .from("mailings")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mailing?.appeal_id) return null;
      const rows = await loadRows(supabase, mailing.appeal_id);
      if (!rows) return null;
      return rowsToIntent(rows.appeal, rows.mailing ?? null);
    },

    async updateStatus(intentId, update) {
      const supabase = await getSupabaseServer();
      const { data: appeal, error } = await supabase.from("appeals").select("*").eq("id", intentId).single();
      if (error || !appeal) throw new Error(`Mailing intent (appeal) not found: ${intentId}`);

      const { data: existingMailing } = await supabase
        .from("mailings")
        .select("id")
        .eq("appeal_id", intentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      const mailingPatch: Record<string, unknown> = { updated_at: nowIso };
      if (update.status) mailingPatch.status = update.status;
      if (update.stripe_session_id !== undefined) mailingPatch.stripe_session_id = update.stripe_session_id;
      if (update.stripe_payment_intent_id !== undefined) mailingPatch.stripe_payment_id = update.stripe_payment_intent_id;
      if (update.provider_order_id !== undefined) mailingPatch.provider_order_id = update.provider_order_id;
      if (update.tracking_number !== undefined) mailingPatch.tracking_number = update.tracking_number;
      if (update.error_message !== undefined) mailingPatch.error_message = update.error_message;

      const packet = appeal.packet || {};
      if (existingMailing) {
        await supabase.from("mailings").update(mailingPatch).eq("id", existingMailing.id);
      } else {
        await supabase.from("mailings").insert({
          appeal_id: intentId,
          mailing_method: packet.mailingMethod || "standard",
          recipient: {
            name: packet.recipientName,
            address1: packet.recipientAddress1,
            address2: packet.recipientAddress2,
            city: packet.recipientCity,
            state: packet.recipientState,
            zip: packet.recipientZip,
          },
          ...mailingPatch,
        });
      }

      if (update.status) {
        const nextAppealStatus = mapFulfillmentStatusToAppealStatus(update.status, appeal.status);
        const isMailedEvent = ["submitted", "tracking", "delivered"].includes(update.status);
        const proof = {
          ...(appeal.proof || {}),
          id: appeal.proof?.id || crypto.randomUUID(),
          appealId: intentId,
          packetId: packet.id,
          finalAppealHash: packet.approvedDraftHash || "",
          attachmentHashes: appeal.proof?.attachmentHashes || [],
          recipientName: packet.recipientName,
          recipientAddress1: packet.recipientAddress1,
          recipientCity: packet.recipientCity,
          recipientState: packet.recipientState,
          recipientZip: packet.recipientZip,
          mailingMethod: packet.mailingMethod || "standard",
          providerOrderId: update.provider_order_id ?? appeal.proof?.providerOrderId,
          trackingNumber: update.tracking_number ?? appeal.proof?.trackingNumber,
          mailingTimestamp: isMailedEvent ? (appeal.proof?.mailingTimestamp || nowIso) : appeal.proof?.mailingTimestamp,
          status: mapFulfillmentStatusToProofStatus(update.status),
          createdAt: appeal.proof?.createdAt || nowIso,
          sealedAt: isMailedEvent ? nowIso : appeal.proof?.sealedAt,
        };
        await supabase
          .from("appeals")
          .update({ status: nextAppealStatus, proof, updated_at: nowIso })
          .eq("id", intentId);
      }
    },
  };
}
