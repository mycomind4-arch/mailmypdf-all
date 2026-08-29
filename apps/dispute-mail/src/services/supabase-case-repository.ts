import { canTransitionCase, transitionCase, type DisputeCase, type DisputeCaseStatus } from "@/domain/case";
import type { CreateDisputeCaseInput, DisputeCaseRepository } from "@/domain/case-repository";
import { CaseOwnershipError, CaseVersionConflictError } from "@/domain/case-repository";
import type { WorkflowId } from "@/domain/workflows";

interface SupabaseCaseRow { id: string; owner_id: string; workflow_id: string; document_id: string; status: DisputeCaseStatus; version: number; created_at: string; updated_at: string; approved_at: string | null; submitted_at: string | null; provider_order_id: string | null; tracking_number: string | null; proof_hash: string | null; }

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase case persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return { base: `${url.replace(/\/$/, "")}/rest/v1/dispute_cases`, key };
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> { return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra }; }

function fromRow(row: SupabaseCaseRow): DisputeCase {
  return { id: row.id, ownerId: row.owner_id, workflowId: row.workflow_id as WorkflowId, documentId: row.document_id, status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, approvedAt: row.approved_at, submittedAt: row.submitted_at, providerOrderId: row.provider_order_id, trackingNumber: row.tracking_number, proofHash: row.proof_hash };
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Supabase case persistence failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export class SupabaseCaseRepository implements DisputeCaseRepository {
  async create(input: CreateDisputeCaseInput): Promise<DisputeCase> {
    if (!input.ownerId.trim()) throw new Error("ownerId is required");
    const { base, key } = config();
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), owner_id: input.ownerId, workflow_id: input.workflowId, document_id: input.documentId, status: "draft", version: 1, created_at: now, updated_at: now, approved_at: null, submitted_at: null, provider_order_id: null, tracking_number: null, proof_hash: null };
    const response = await fetch(base, { method: "POST", headers: headers(key, { Prefer: "return=representation" }), body: JSON.stringify(row) });
    const created = await readResponse<SupabaseCaseRow[]>(response);
    if (!created[0]) throw new Error("Supabase did not return the created dispute case");
    return fromRow(created[0]);
  }

  async get(ownerId: string, caseId: string): Promise<DisputeCase | null> {
    const { base, key } = config();
    const response = await fetch(`${base}?id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`, { headers: headers(key) });
    const rows = await readResponse<SupabaseCaseRow[]>(response);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(ownerId: string, workflowId?: WorkflowId): Promise<DisputeCase[]> {
    const { base, key } = config();
    const workflowFilter = workflowId ? `&workflow_id=eq.${encodeURIComponent(workflowId)}` : "";
    const response = await fetch(`${base}?owner_id=eq.${encodeURIComponent(ownerId)}${workflowFilter}&order=updated_at.desc`, { headers: headers(key) });
    const rows = await readResponse<SupabaseCaseRow[]>(response);
    return rows.map(fromRow);
  }

  async update(ownerId: string, caseId: string, expectedVersion: number, patch: Partial<DisputeCase>): Promise<DisputeCase> {
    const { base, key } = config();
    const allowed: Record<string, unknown> = {};
    for (const field of ["documentId", "providerOrderId", "trackingNumber", "proofHash"] as const) if (field in patch) allowed[field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)] = patch[field];
    const payload = { ...allowed, version: expectedVersion + 1, updated_at: new Date().toISOString() };
    const response = await fetch(`${base}?id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(ownerId)}&version=eq.${expectedVersion}`, { method: "PATCH", headers: headers(key, { Prefer: "return=representation" }), body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Supabase case update failed with status ${response.status}`);
    const rows = await response.json() as SupabaseCaseRow[];
    if (!rows[0]) throw new CaseVersionConflictError();
    return fromRow(rows[0]);
  }

  async transition(ownerId: string, caseId: string, expectedVersion: number, next: DisputeCaseStatus, fields: Partial<Pick<DisputeCase, "providerOrderId" | "trackingNumber" | "proofHash">> = {}): Promise<DisputeCase> {
    const current = await this.get(ownerId, caseId);
    if (!current) throw new CaseOwnershipError();
    if (current.version !== expectedVersion) throw new CaseVersionConflictError();
    if (!canTransitionCase(current.status, next)) throw new Error(`Invalid dispute case transition: ${current.status} -> ${next}`);
    const nextCase = transitionCase(current, next, new Date().toISOString(), fields);
    return this.update(ownerId, caseId, expectedVersion, { documentId: nextCase.documentId, providerOrderId: nextCase.providerOrderId, trackingNumber: nextCase.trackingNumber, proofHash: nextCase.proofHash });
  }
}

export const supabaseCaseRepository = new SupabaseCaseRepository();
