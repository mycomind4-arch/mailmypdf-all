/**
 * Proof-of-Service — Lob Bridge
 *
 * Connects the proof-of-service communication flow to the existing
 * Lob integration (src/lib/lob.server.ts). This bridges the gap between
 * the new API layer and the existing mail infrastructure.
 *
 * Flow:
 * 1. Create a communication record (proof-of-service layer)
 * 2. Sign the document's storage URL for Lob to fetch
 * 3. Submit to Lob via the existing createLobLetter()
 * 4. Append custody events (sent, tracking number)
 * 5. Update the communication record with Lob letter ID + tracking
 *
 * Per-tenant Lob keys: if the tenant has a lob_api_key stored, it's used
 * instead of the platform's LOB_API_KEY. This allows each tenant to bring
 * their own Lob account for billing isolation.
 */

import { createLobLetter, type MailClass } from "@/lib/lob.server";
import { getConfig } from "@/config";
import { appendCustodyEvent } from "./communications";
import { computeResponseWindowEnds } from "./proof-bundle";
import { dispatchWebhook } from "./webhooks";
import type { CommunicationRecord, MailType, CustodyEventType, CommunicationStatus } from "./types";

/**
 * Map proof-of-service MailType to Lob's extra_service parameter.
 */
function mailTypeToLobExtraService(mailType: MailType): MailClass | undefined {
  switch (mailType) {
    case "first_class":
      return undefined; // standard Lob letter
    case "certified":
      return "certified";
    case "certified_return_receipt":
      return "certified"; // Lob handles return receipt via electronic delivery
    case "registered":
      return "registered";
    default:
      return undefined;
  }
}

export interface SendCommunicationParams {
  communication: CommunicationRecord;
  documentStoragePath: string;
  /** Sender address (required by Lob — the return address on the envelope) */
  fromAddress: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postal: string;
  };
}

export interface SendCommunicationResult {
  lob_letter_id: string;
  tracking_number: string | null;
  sent_at: string;
}

/**
 * Fetch the tenant's Lob API key from the database.
 * Returns null if the tenant doesn't have a custom key (use platform key).
 */
async function getTenantLobKey(
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<string | null> {
  const { data, error } = await deps.supabaseAdmin
    .from("proof_tenants")
    .select("lob_api_key")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data.lob_api_key ?? null;
}

/**
 * Send a communication via Lob and update the proof-of-service record.
 *
 * This is the bridge between the proof-of-service layer and the existing
 * Lob integration. It:
 * 1. Creates a signed URL for the document (Lob fetches it server-side)
 * 2. Submits to Lob via createLobLetter() (uses tenant's Lob key if available)
 * 3. Appends a "sent" custody event with the tracking number
 * 4. Updates the communication record with Lob letter ID + tracking + sent_at
 * 5. Computes the response window end from sent_at + legal_reference.response_window_days
 * 6. Dispatches the communication.sent webhook
 */
export async function sendCommunicationViaLob(
  params: SendCommunicationParams,
  deps: {
    supabaseAdmin: import("@supabase/supabase-js").SupabaseClient;
  },
): Promise<SendCommunicationResult> {
  const { supabaseAdmin } = deps;
  const config = getConfig();

  // Get the tenant's Lob key (falls back to platform key if null)
  const tenantLobKey = await getTenantLobKey(params.communication.tenant_id, deps);

  if (!config.lob.apiKey && !tenantLobKey) {
    throw new Error("Lob is not configured — set LOB_API_KEY or provide a tenant lob_api_key");
  }

  const comm = params.communication;
  const now = new Date().toISOString();

  // 1. Create signed URL for the document (Lob fetches it)
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(config.storage.bucketName)
    .createSignedUrl(params.documentStoragePath, 3600); // 1 hour TTL

  if (signErr || !signed) {
    throw new Error(`Could not sign document URL for Lob: ${signErr?.message ?? "unknown"}`);
  }

  // 2. Submit to Lob (with tenant's key if available)
  const extraService = mailTypeToLobExtraService(comm.mail_type);
  const lobLetter = await createLobLetter({
    orderId: comm.id, // reuse as idempotency key
    pdfUrl: signed.signedUrl,
    idempotencyKey: `proof_comm_${comm.id}`,
    color: false,
    extraService,
    to: {
      name: comm.recipient.name,
      line1: comm.recipient.address_line1,
      line2: comm.recipient.address_line2,
      city: comm.recipient.city,
      state: comm.recipient.state,
      postal: comm.recipient.postal_code,
    },
    from: params.fromAddress,
    description: `Proof-of-Service: ${comm.matter_type} — ${comm.matter_reference}`,
    apiKey: tenantLobKey ?? undefined, // pass tenant's key, or undefined to use platform key
  });

  // 3. Append "sent" custody event
  await appendCustodyEvent(
    {
      communication_id: comm.id,
      tenant_id: comm.tenant_id,
      event_type: "sent",
      description: `Submitted to Lob for ${comm.mail_type.replace(/_/g, " ")} mailing`,
      carrier_event_id: lobLetter.id,
      new_status: "sent",
      sent_at: now,
      tracking_number: lobLetter.tracking_number,
      lob_letter_id: lobLetter.id,
    },
    deps,
  );

  // 4. Update legal_reference with computed response window end
  let updatedLegalReference = comm.legal_reference;
  if (comm.legal_reference.response_window_days && !comm.legal_reference.response_window_ends) {
    const windowEnd = computeResponseWindowEnds(now, comm.legal_reference.response_window_days);
    updatedLegalReference = {
      ...comm.legal_reference,
      response_window_ends: windowEnd,
    };

    // Update the communication record's legal_reference
    await supabaseAdmin
      .from("proof_communications")
      .update({ legal_reference: updatedLegalReference })
      .eq("id", comm.id)
      .eq("tenant_id", comm.tenant_id);
  }

  // 5. Dispatch webhook (if tenant has webhook configured)
  if (comm.tenant_id) {
    const { data: tenant } = await supabaseAdmin
      .from("proof_tenants")
      .select("webhook_url, webhook_secret")
      .eq("id", comm.tenant_id)
      .maybeSingle();

    if (tenant?.webhook_url) {
      await dispatchWebhook(
        {
          event_id: `evt_${comm.id}_sent`,
          event_type: "communication.sent",
          timestamp: now,
          data: {
            communication_id: comm.id,
            status: "sent",
            tracking_number: lobLetter.tracking_number ?? undefined,
          },
        },
        comm.tenant_id,
        tenant.webhook_url,
        tenant.webhook_secret,
        deps,
        comm.id,
      ).catch(() => {
        // Webhook failures shouldn't block the send — retry happens async
      });
    }
  }

  return {
    lob_letter_id: lobLetter.id,
    tracking_number: lobLetter.tracking_number ?? null,
    sent_at: now,
  };
}

/**
 * Map a Lob webhook status to a proof-of-service custody event.
 * This bridges the existing processLobWebhook flow to the proof-of-service layer.
 */
export function mapLobStatusToCustodyEvent(
  lobStatus: string,
): { eventType: CustodyEventType; description: string; newStatus: CommunicationStatus } | null {
  switch (lobStatus) {
    case "created":
    case "rendered":
    case "processed":
    case "printed":
      return {
        eventType: "in_transit",
        description: "Letter processed by carrier",
        newStatus: "in_transit",
      };
    case "mailed":
      return {
        eventType: "in_transit",
        description: "Letter mailed",
        newStatus: "in_transit",
      };
    case "in_transit":
    case "in_local_area":
    case "processed_for_delivery":
    case "re-routed":
      return {
        eventType: "in_transit",
        description: `Letter ${lobStatus.replace(/_/g, " ")}`,
        newStatus: "in_transit",
      };
    case "delivered":
      return {
        eventType: "delivered",
        description: "Letter delivered to recipient",
        newStatus: "delivered",
      };
    case "returned":
    case "returned_to_sender":
      return {
        eventType: "returned",
        description: "Letter returned to sender",
        newStatus: "returned",
      };
    case "failed":
    case "error":
    case "cancelled":
      return {
        eventType: "undelivered",
        description: `Letter delivery failed: ${lobStatus}`,
        newStatus: "undelivered",
      };
    default:
      return null;
  }
}

/**
 * Process a Lob webhook event for a proof-of-service communication.
 * Called from the existing webhook handler when the letter matches a
 * proof_communications record (not an orders record).
 */
export async function processLobEventForCommunication(
  letterId: string,
  lobStatus: string,
  externalEventId: string | null,
  signatureImageUrl: string | null,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<void> {
  const { supabaseAdmin } = deps;

  // Find the communication by lob_letter_id
  const { data: comm, error } = await supabaseAdmin
    .from("proof_communications")
    .select("id, tenant_id, status")
    .eq("lob_letter_id", letterId)
    .maybeSingle();

  if (error || !comm) return; // Not a proof-of-service communication

  const mapping = mapLobStatusToCustodyEvent(lobStatus);
  if (!mapping) return;

  const now = new Date().toISOString();

  // Append custody event
  await appendCustodyEvent(
    {
      communication_id: comm.id,
      tenant_id: comm.tenant_id,
      event_type: mapping.eventType,
      description: mapping.description,
      carrier_event_id: externalEventId,
      new_status: mapping.newStatus,
      delivered_at: mapping.newStatus === "delivered" ? now : undefined,
      signature_image_url: signatureImageUrl ?? undefined,
    },
    deps,
  );

  // Dispatch webhook to tenant
  const { data: tenant } = await supabaseAdmin
    .from("proof_tenants")
    .select("webhook_url, webhook_secret")
    .eq("id", comm.tenant_id)
    .maybeSingle();

  if (tenant?.webhook_url) {
    const webhookType =
      mapping.newStatus === "delivered" ? "communication.delivered" :
      mapping.newStatus === "returned" ? "communication.returned" :
      mapping.newStatus === "undelivered" ? "communication.undelivered" :
      "communication.in_transit";

    await dispatchWebhook(
      {
        event_id: `evt_${comm.id}_${externalEventId ?? lobStatus}`,
        event_type: webhookType,
        timestamp: now,
        data: {
          communication_id: comm.id,
          status: mapping.newStatus as CommunicationRecord["status"],
          delivered_at: mapping.newStatus === "delivered" ? now : null,
          signature_image_url: signatureImageUrl,
        },
      },
      comm.tenant_id,
      tenant.webhook_url,
      tenant.webhook_secret,
      deps,
      comm.id,
    ).catch(() => {
      // Webhook failures don't block processing
    });
  }
}
