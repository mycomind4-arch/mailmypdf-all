/**
 * Proof-of-Service — Communication Service
 *
 * The central service for creating, sending, and tracking communications.
 * This is where the hash chain is built — every communication record
 * links to the prior record for the same matter_reference.
 */

import { randomUUID } from "node:crypto";
import { hashRecord, hashCustodyEvent } from "./hashing";
import type {
  CommunicationRecord,
  LegalReference,
  MailType,
  Recipient,
  CustodyEvent,
} from "./types";

export interface CreateCommunicationParams {
  tenant_id: string;
  idempotency_key?: string;
  document_id: string;
  document_sha256: string;
  legal_reference: LegalReference;
  recipient: Recipient;
  mail_type: MailType;
  matter_reference: string;
  matter_type: string;
  metadata?: Record<string, unknown>;
}

export async function createCommunication(
  params: CreateCommunicationParams,
  deps: {
    supabaseAdmin: import("@supabase/supabase-js").SupabaseClient;
  },
): Promise<CommunicationRecord> {
  const { supabaseAdmin } = deps;
  const communicationId = randomUUID();
  const now = new Date().toISOString();

  const { data: priorRecords } = await supabaseAdmin
    .from("proof_communications")
    .select("record_sha256")
    .eq("tenant_id", params.tenant_id)
    .eq("matter_reference", params.matter_reference)
    .order("created_at", { ascending: false })
    .limit(1);

  const priorRecordHash = priorRecords?.[0]?.record_sha256 ?? null;

  const hashContent = {
    document_sha256: params.document_sha256,
    legal_reference: params.legal_reference,
    recipient: {
      name: params.recipient.name,
      address_line1: params.recipient.address_line1,
      address_line2: params.recipient.address_line2,
      city: params.recipient.city,
      state: params.recipient.state,
      postal_code: params.recipient.postal_code,
      country: params.recipient.country,
    },
    mail_type: params.mail_type,
    matter_reference: params.matter_reference,
    matter_type: params.matter_type,
    prior_record_hash: priorRecordHash,
  };
  const recordSha256 = hashRecord(hashContent);

  const { data: comm, error: commError } = await supabaseAdmin
    .from("proof_communications")
    .insert({
      id: communicationId,
      tenant_id: params.tenant_id,
      idempotency_key: params.idempotency_key ?? null,
      document_id: params.document_id,
      document_sha256: params.document_sha256,
      legal_reference: params.legal_reference,
      recipient: params.recipient,
      mail_type: params.mail_type,
      carrier: "usps",
      status: "created",
      prior_record_hash: priorRecordHash,
      record_sha256: recordSha256,
      matter_reference: params.matter_reference,
      matter_type: params.matter_type,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (commError) {
    throw new Error(`Failed to create communication record: ${commError.message}`);
  }

  const createdEventHash = hashCustodyEvent({
    priorEventHash: null,
    timestamp: now,
    eventType: "created",
    description: "Communication record created",
  });

  const { error: eventError } = await supabaseAdmin.from("proof_custody_events").insert({
    communication_id: communicationId,
    timestamp: now,
    event_type: "created",
    description: "Communication record created",
    carrier_event_id: null,
    event_hash: createdEventHash,
    prior_event_hash: null,
  });

  if (eventError) {
    throw new Error(`Failed to create custody event: ${eventError.message}`);
  }

  return mapDbRowToCommunicationRecord(comm, [
    {
      timestamp: now,
      event_type: "created",
      description: "Communication record created",
      carrier_event_id: null,
      event_hash: createdEventHash,
      prior_event_hash: null,
    },
  ]);
}

export interface AppendCustodyEventParams {
  communication_id: string;
  tenant_id: string;
  event_type: string;
  description: string;
  carrier_event_id?: string | null;
  new_status?: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  tracking_number?: string | null;
  signature_image_url?: string | null;
  proof_of_delivery?: string | null;
  lob_letter_id?: string | null;
}

export async function appendCustodyEvent(
  params: AppendCustodyEventParams,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<CustodyEvent> {
  const { supabaseAdmin } = deps;
  const now = new Date().toISOString();

  const { data: lastEvent } = await supabaseAdmin
    .from("proof_custody_events")
    .select("event_hash")
    .eq("communication_id", params.communication_id)
    .order("timestamp", { ascending: false })
    .limit(1);

  const priorEventHash = lastEvent?.[0]?.event_hash ?? null;
  const eventHash = hashCustodyEvent({
    priorEventHash,
    timestamp: now,
    eventType: params.event_type,
    description: params.description,
  });

  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from("proof_custody_events")
    .insert({
      communication_id: params.communication_id,
      timestamp: now,
      event_type: params.event_type,
      description: params.description,
      carrier_event_id: params.carrier_event_id ?? null,
      event_hash: eventHash,
      prior_event_hash: priorEventHash,
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(`Failed to append custody event: ${eventError.message}`);
  }

  const updates: Record<string, unknown> = {};
  if (params.new_status) updates.status = params.new_status;
  if (params.sent_at !== undefined) updates.sent_at = params.sent_at;
  if (params.delivered_at !== undefined) updates.delivered_at = params.delivered_at;
  if (params.tracking_number !== undefined) updates.tracking_number = params.tracking_number;
  if (params.signature_image_url !== undefined) updates.signature_image_url = params.signature_image_url;
  if (params.proof_of_delivery !== undefined) updates.proof_of_delivery = params.proof_of_delivery;
  if (params.lob_letter_id !== undefined) updates.lob_letter_id = params.lob_letter_id;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("proof_communications")
      .update(updates)
      .eq("id", params.communication_id)
      .eq("tenant_id", params.tenant_id);

    if (updateError) {
      throw new Error(`Failed to update communication: ${updateError.message}`);
    }
  }

  return {
    timestamp: eventRow.timestamp,
    event_type: eventRow.event_type,
    description: eventRow.description,
    carrier_event_id: eventRow.carrier_event_id,
    event_hash: eventRow.event_hash,
    prior_event_hash: eventRow.prior_event_hash,
  };
}

export async function getCommunication(
  communicationId: string,
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<CommunicationRecord | null> {
  const { supabaseAdmin } = deps;

  const { data: comm, error } = await supabaseAdmin
    .from("proof_communications")
    .select("*")
    .eq("id", communicationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch communication: ${error.message}`);
  if (!comm) return null;

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("proof_custody_events")
    .select("*")
    .eq("communication_id", communicationId)
    .order("timestamp", { ascending: true });

  if (eventsError) throw new Error(`Failed to fetch custody events: ${eventsError.message}`);

  return mapDbRowToCommunicationRecord(comm, events ?? []);
}

export async function listCommunications(
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  filters?: {
    matter_reference?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ records: CommunicationRecord[]; has_more: boolean }> {
  const { supabaseAdmin } = deps;
  const limit = Math.min(filters?.limit ?? 50, 500);
  const offset = filters?.offset ?? 0;

  let query = supabaseAdmin
    .from("proof_communications")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (filters?.matter_reference) query = query.eq("matter_reference", filters.matter_reference);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data: rows, error } = await query;
  if (error) throw new Error(`Failed to list communications: ${error.message}`);
  if (!rows) return { records: [], has_more: false };

  const commIds = rows.map((r: { id: string }) => r.id);
  const { data: events } = await supabaseAdmin
    .from("proof_custody_events")
    .select("*")
    .in("communication_id", commIds)
    .order("timestamp", { ascending: true });

  const eventsByComm = (events ?? []).reduce((acc: Record<string, CustodyEvent[]>, e: Record<string, unknown>) => {
    const commId = e.communication_id as string;
    if (!acc[commId]) acc[commId] = [];
    acc[commId].push({
      timestamp: e.timestamp as string,
      event_type: e.event_type as string,
      description: e.description as string,
      carrier_event_id: e.carrier_event_id as string | null,
      event_hash: e.event_hash as string,
      prior_event_hash: e.prior_event_hash as string | null,
    });
    return acc;
  }, {});

  const records = rows.map((row: Record<string, unknown>) =>
    mapDbRowToCommunicationRecord(row, eventsByComm[row.id as string] ?? []),
  );

  return { records, has_more: rows.length === limit };
}

function mapDbRowToCommunicationRecord(
  row: Record<string, unknown>,
  events: CustodyEvent[],
): CommunicationRecord {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    idempotency_key: row.idempotency_key as string | null,
    document_id: row.document_id as string,
    document_sha256: row.document_sha256 as string,
    legal_reference: row.legal_reference as LegalReference,
    recipient: row.recipient as Recipient,
    mail_type: row.mail_type as MailType,
    carrier: row.carrier as string,
    lob_letter_id: row.lob_letter_id as string,
    status: row.status as CommunicationRecord["status"],
    tracking_number: row.tracking_number as string,
    sent_at: row.sent_at as string | null,
    delivered_at: row.delivered_at as string | null,
    signature_image_url: row.signature_image_url as string | null,
    proof_of_delivery: row.proof_of_delivery as string | null,
    custody_chain: events,
    prior_record_hash: row.prior_record_hash as string | null,
    record_sha256: row.record_sha256 as string,
    matter_reference: row.matter_reference as string,
    matter_type: row.matter_type as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
