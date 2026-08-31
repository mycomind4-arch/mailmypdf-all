import { z } from "zod";
import type { EvidenceItem } from "@/domain/gold-standard";
import type { DisputeEvidenceRepository } from "@/domain/evidence-repository";

const evidenceRowSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  owner_id: z.string(),
  description: z.string(),
  status: z.enum(["missing", "requested", "provided", "verified", "rejected", "not_applicable"]),
  source_document_id: z.string().nullable(),
  supports_finding_ids: z.array(z.string()),
  verified_at: z.string().nullable(),
  verified_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type EvidenceRow = z.infer<typeof evidenceRowSchema>;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase evidence persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return { base: `${url.replace(/\/$/, "")}/rest/v1/dispute_case_evidence`, key };
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> {
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

function fromRow(row: EvidenceRow): EvidenceItem {
  return { id: row.id, description: row.description, status: row.status, supportsFindingIds: row.supports_finding_ids };
}

async function responseRows(response: Response): Promise<EvidenceRow[]> {
  if (!response.ok) throw new Error(`Supabase evidence persistence failed with status ${response.status}`);
  return z.array(evidenceRowSchema).parse(await response.json());
}

export class SupabaseEvidenceRepository implements DisputeEvidenceRepository {
  async list(ownerId: string, caseId: string): Promise<EvidenceItem[]> {
    const { base, key } = config();
    const response = await fetch(`${base}?owner_id=eq.${encodeURIComponent(ownerId)}&case_id=eq.${encodeURIComponent(caseId)}&order=created_at.asc`, { headers: headers(key) });
    return (await responseRows(response)).map(fromRow);
  }

  async upsert(ownerId: string, caseId: string, item: EvidenceItem, sourceDocumentId?: string): Promise<EvidenceItem> {
    const { base, key } = config();
    const timestamp = new Date().toISOString();
    const payload = {
      id: item.id,
      case_id: caseId,
      owner_id: ownerId,
      description: item.description,
      status: item.status,
      source_document_id: sourceDocumentId ?? null,
      supports_finding_ids: item.supportsFindingIds,
      verified_at: item.status === "verified" ? timestamp : null,
      verified_by: null,
      updated_at: timestamp,
    };
    const response = await fetch(`${base}?id=eq.${encodeURIComponent(item.id)}&owner_id=eq.${encodeURIComponent(ownerId)}&case_id=eq.${encodeURIComponent(caseId)}`, {
      method: "POST",
      headers: headers(key, { Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify({ ...payload, created_at: timestamp }),
    });
    const rows = await responseRows(response);
    if (!rows[0]) throw new Error("Supabase did not return the persisted evidence item");
    return fromRow(rows[0]);
  }

  async verify(ownerId: string, caseId: string, evidenceId: string, reviewerId: string): Promise<EvidenceItem> {
    if (!reviewerId.trim()) throw new Error("reviewerId is required to verify evidence");
    return this.changeStatus(ownerId, caseId, evidenceId, "verified", reviewerId);
  }

  async reject(ownerId: string, caseId: string, evidenceId: string, reviewerId: string): Promise<EvidenceItem> {
    if (!reviewerId.trim()) throw new Error("reviewerId is required to reject evidence");
    return this.changeStatus(ownerId, caseId, evidenceId, "rejected", reviewerId);
  }

  private async changeStatus(ownerId: string, caseId: string, evidenceId: string, status: "verified" | "rejected", reviewerId: string): Promise<EvidenceItem> {
    const { base, key } = config();
    const response = await fetch(`${base}?id=eq.${encodeURIComponent(evidenceId)}&case_id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
      method: "PATCH",
      headers: headers(key, { Prefer: "return=representation" }),
      body: JSON.stringify({ status, verified_at: status === "verified" ? new Date().toISOString() : null, verified_by: reviewerId, updated_at: new Date().toISOString() }),
    });
    const rows = await responseRows(response);
    if (!rows[0]) throw new Error("Evidence item not found for this owner/case");
    return fromRow(rows[0]);
  }
}

export const supabaseEvidenceRepository = new SupabaseEvidenceRepository();
