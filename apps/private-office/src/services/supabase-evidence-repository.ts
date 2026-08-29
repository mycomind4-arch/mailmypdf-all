import type { EvidenceItem } from "@/domain/gold-standard";
import type { MatterEvidenceRepository } from "@/domain/evidence-repository";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase evidence persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  return { base: `${url.replace(/\/$/, "")}/rest/v1/private_office_evidence`, key };
}

function headers(
  key: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

interface EvidenceRow {
  id: string;
  matter_id: string;
  owner_id: string;
  description: string;
  status: string;
  source_document_id: string | null;
  supports_finding_ids: unknown;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: EvidenceRow): EvidenceItem {
  return {
    id: row.id,
    description: row.description,
    status: row.status as EvidenceItem["status"],
    supportsFindingIds: Array.isArray(row.supports_finding_ids)
      ? (row.supports_finding_ids as string[])
      : [],
  };
}

export class SupabaseEvidenceRepository implements MatterEvidenceRepository {
  async list(ownerId: string, matterId: string): Promise<EvidenceItem[]> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.asc`,
      { headers: headers(key) },
    );
    if (!response.ok) throw new Error(`Supabase evidence list failed: ${response.status}`);
    const rows = (await response.json()) as EvidenceRow[];
    return rows.map(fromRow);
  }

  async upsert(
    ownerId: string,
    matterId: string,
    item: EvidenceItem,
    sourceDocumentId?: string,
  ): Promise<EvidenceItem> {
    const { base, key } = config();
    const now = new Date().toISOString();
    const payload = {
      id: item.id,
      matter_id: matterId,
      owner_id: ownerId,
      description: item.description,
      status: item.status,
      source_document_id: sourceDocumentId ?? null,
      supports_finding_ids: JSON.stringify(item.supportsFindingIds),
      verified_at: null,
      verified_by: null,
      created_at: now,
      updated_at: now,
    };
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(item.id)}&matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      {
        method: "POST",
        headers: headers(key, { Prefer: "return=representation,upsert=merge" }),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error(`Supabase evidence upsert failed: ${response.status}`);
    const rows = (await response.json()) as EvidenceRow[];
    if (!rows[0]) throw new Error("Supabase did not return the upserted evidence item");
    return fromRow(rows[0]);
  }

  async verify(
    ownerId: string,
    matterId: string,
    evidenceId: string,
    reviewerId: string,
  ): Promise<EvidenceItem> {
    const { base, key } = config();
    const now = new Date().toISOString();
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(evidenceId)}&matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          status: "verified",
          verified_at: now,
          verified_by: reviewerId,
          updated_at: now,
        }),
      },
    );
    if (!response.ok) throw new Error(`Supabase evidence verify failed: ${response.status}`);
    const rows = (await response.json()) as EvidenceRow[];
    if (!rows[0]) throw new Error("Evidence item not found or not owned by requester");
    return fromRow(rows[0]);
  }

  async reject(
    ownerId: string,
    matterId: string,
    evidenceId: string,
    reviewerId: string,
  ): Promise<EvidenceItem> {
    const { base, key } = config();
    const now = new Date().toISOString();
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(evidenceId)}&matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          status: "rejected",
          verified_at: now,
          verified_by: reviewerId,
          updated_at: now,
        }),
      },
    );
    if (!response.ok) throw new Error(`Supabase evidence reject failed: ${response.status}`);
    const rows = (await response.json()) as EvidenceRow[];
    if (!rows[0]) throw new Error("Evidence item not found or not owned by requester");
    return fromRow(rows[0]);
  }
}

export const supabaseEvidenceRepository = new SupabaseEvidenceRepository();
