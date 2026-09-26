/**
 * Proof-of-Service — Lob Webhook Bridge
 *
 * Extends the existing processLobWebhook to also handle events for
 * proof-of-service communications (not just consumer orders).
 *
 * This function is called from the existing /api/public/lob-webhook route
 * AFTER the existing order-processing logic has run (and not matched).
 * Or it can be called directly if the letter ID doesn't match any order.
 */

import { processLobEventForCommunication } from "./lob-bridge";

/**
 * Check if a Lob letter event belongs to a proof-of-service communication
 * and process it if so. Returns true if handled, false if not a PoS communication.
 */
export async function handleProofOfServiceLobEvent(
  letterId: string,
  lobStatus: string,
  externalEventId: string | null,
  signatureImageUrl: string | null,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<boolean> {
  // Check if this letter_id belongs to a proof_communications record.
  // Database or processing failures must propagate so Lob receives a non-2xx
  // response and can retry the webhook instead of silently losing evidence.
  const { supabaseAdmin } = deps;
  const { data: comm, error } = await supabaseAdmin
    .from("proof_communications")
    .select("id")
    .eq("lob_letter_id", letterId)
    .maybeSingle();

  if (error) throw new Error(`Proof communication lookup failed: ${error.message}`);
  if (!comm) return false; // Not a proof-of-service communication

  await processLobEventForCommunication(letterId, lobStatus, externalEventId, signatureImageUrl, deps);
  return true;
}
