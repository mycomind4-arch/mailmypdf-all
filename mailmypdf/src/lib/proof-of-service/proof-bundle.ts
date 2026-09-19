/**
 * Proof-of-Service — Proof Bundle Generator
 *
 * Assembles the exportable evidence package: document hash, send proof,
 * delivery proof, legal context, response window status, address
 * verification, and the full hash-linked custody chain. This is what
 * gets handed to a judge.
 */

import { createHash } from "node:crypto";
import { canonicalJSON } from "./hashing";
import { getCommunication } from "./communications";
import type { CommunicationRecord, ProofBundle, ResponseWindowStatus } from "./types";

/**
 * Generate (or retrieve) a proof bundle for a communication.
 *
 * The bundle is computed on-demand from the communication record and
 * its custody chain. The bundle_sha256 is computed over the canonical
 * content of the bundle, making it independently verifiable.
 */
export async function generateProofBundle(
  communicationId: string,
  tenantId: string,
  deps: {
    supabaseAdmin: import("@supabase/supabase-js").SupabaseClient;
  },
): Promise<ProofBundle | null> {
  const comm = await getCommunication(communicationId, tenantId, deps);
  if (!comm) return null;

  // Compute response window status
  const windowStatus = computeResponseWindowStatus(comm);

  // Fetch document filename
  const { data: doc } = await deps.supabaseAdmin
    .from("proof_documents")
    .select("filename")
    .eq("id", comm.document_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Fetch address verification from custody events
  const addressVerification = extractAddressVerification(comm);

  const now = new Date().toISOString();

  // Build the bundle content (excluding the hash itself)
  const bundleContent = {
    communication_id: comm.id,
    document_sha256: comm.document_sha256,
    document_filename: doc?.filename ?? "unknown",
    sent_at: comm.sent_at,
    carrier: comm.carrier,
    tracking_number: comm.tracking_number,
    mail_type: comm.mail_type,
    delivered_at: comm.delivered_at,
    signature_image_url: comm.signature_image_url,
    proof_of_delivery: comm.proof_of_delivery,
    legal_reference: comm.legal_reference,
    response_window_status: windowStatus,
    response_window_ends: comm.legal_reference.response_window_ends,
    address_verification: addressVerification,
    custody_chain: comm.custody_chain.map((e) => ({
      timestamp: e.timestamp,
      event_type: e.event_type,
      description: e.description,
      event_hash: e.event_hash,
      prior_event_hash: e.prior_event_hash,
    })),
  };

  const bundleSha256 = createHash("sha256")
    .update(canonicalJSON(bundleContent))
    .digest("hex");

  return {
    id: `pb_${comm.id}`,
    communication_id: comm.id,
    tenant_id: comm.tenant_id,
    document_sha256: comm.document_sha256,
    document_filename: doc?.filename ?? "unknown",
    sent_at: comm.sent_at,
    carrier: comm.carrier,
    tracking_number: comm.tracking_number,
    mail_type: comm.mail_type,
    delivered_at: comm.delivered_at,
    signature_image_url: comm.signature_image_url,
    proof_of_delivery: comm.proof_of_delivery,
    legal_reference: comm.legal_reference,
    response_window_status: windowStatus,
    response_window_ends: comm.legal_reference.response_window_ends,
    address_verification: addressVerification,
    custody_chain: comm.custody_chain,
    bundle_sha256: bundleSha256,
    generated_at: now,
  };
}

/**
 * Extract address verification data from the custody chain.
 * The address_verified custody event stores the Lob verification result
 * in its metadata.
 */
function extractAddressVerification(
  comm: CommunicationRecord,
): ProofBundle["address_verification"] {
  const verifyEvent = comm.custody_chain.find(
    (e) => e.event_type === "address_verified",
  );

  if (!verifyEvent) return null;

  // The metadata is stored on the event — we need to access it
  // from the raw event data. The custody_chain items from getCommunication
  // include the full event data.
  const metadata = (verifyEvent as unknown as { metadata?: Record<string, unknown> }).metadata;

  if (!metadata) return null;

  return {
    deliverability: (metadata.deliverability as string) ?? "missing_information",
    is_deliverable: (metadata.is_deliverable as boolean) ?? false,
    verified_address: null, // Not stored in custody event metadata to keep it lean
    corrections: (metadata.corrections as Record<string, { input: string; verified: string }>) ?? null,
    warnings: (metadata.warnings as string[]) ?? [],
    api_succeeded: metadata.deliverability !== undefined,
  };
}

/**
 * Determine the response window status based on the communication's
 * legal reference and current time.
 */
function computeResponseWindowStatus(comm: CommunicationRecord): ResponseWindowStatus {
  const ref = comm.legal_reference;

  if (!ref.response_window_days || !ref.response_window_ends) {
    return "no_window_specified";
  }

  const windowEnd = new Date(ref.response_window_ends);
  const now = new Date();

  if (now < windowEnd) {
    return "within_window";
  }

  return "window_expired_no_response";
}

/**
 * Compute the response window end timestamp from a send timestamp
 * and the legal reference's response_window_days.
 */
export function computeResponseWindowEnds(
  sentAt: string | null,
  responseWindowDays: number | null,
): string | null {
  if (!sentAt || !responseWindowDays) return null;
  const sent = new Date(sentAt);
  const ends = new Date(sent.getTime() + responseWindowDays * 24 * 60 * 60 * 1000);
  return ends.toISOString();
}
