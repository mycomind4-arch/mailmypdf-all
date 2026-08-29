import {
  canTransitionMatter,
  transitionMatter,
  type PrivateOfficeMatter,
  type MatterStatus,
} from "@/domain/matter";
import {
  type CreateMatterInput,
  type MatterRepository,
  MatterOwnershipError,
  MatterVersionConflictError,
} from "@/domain/matter-repository";
import type { WorkflowId } from "@/domain/workflows";

interface SupabaseMatterRow {
  id: string;
  owner_id: string;
  workflow_id: string;
  document_id: string;
  title: string;
  status: MatterStatus;
  version: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_draft_hash: string | null;
  draft_hash: string | null;
  submitted_at: string | null;
  provider_order_id: string | null;
  tracking_number: string | null;
  proof_hash: string | null;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase matter persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  return { base: `${url.replace(/\/$/, "")}/rest/v1/private_office_matters`, key };
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

function fromRow(row: SupabaseMatterRow): PrivateOfficeMatter {
  return {
    id: row.id,
    ownerId: row.owner_id,
    workflowId: row.workflow_id as WorkflowId,
    documentId: row.document_id,
    title: row.title,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedDraftHash: row.approved_draft_hash,
    draftHash: row.draft_hash,
    submittedAt: row.submitted_at,
    providerOrderId: row.provider_order_id,
    trackingNumber: row.tracking_number,
    proofHash: row.proof_hash,
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok)
    throw new Error(`Supabase matter persistence failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export class SupabaseMatterRepository implements MatterRepository {
  async create(input: CreateMatterInput): Promise<PrivateOfficeMatter> {
    if (!input.ownerId.trim()) throw new Error("ownerId is required");
    if (!input.title.trim()) throw new Error("title is required");
    const { base, key } = config();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      owner_id: input.ownerId,
      workflow_id: input.workflowId,
      document_id: input.documentId,
      title: input.title,
      status: "draft",
      version: 1,
      created_at: now,
      updated_at: now,
      approved_at: null,
      approved_draft_hash: null,
      draft_hash: null,
      submitted_at: null,
      provider_order_id: null,
      tracking_number: null,
      proof_hash: null,
    };
    const response = await fetch(base, {
      method: "POST",
      headers: headers(key, { Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });
    const created = await readResponse<SupabaseMatterRow[]>(response);
    if (!created[0])
      throw new Error("Supabase did not return the created matter");
    return fromRow(created[0]);
  }

  async get(
    ownerId: string,
    matterId: string,
  ): Promise<PrivateOfficeMatter | null> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers: headers(key) },
    );
    const rows = await readResponse<SupabaseMatterRow[]>(response);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(
    ownerId: string,
    workflowId?: WorkflowId,
  ): Promise<PrivateOfficeMatter[]> {
    const { base, key } = config();
    const workflowFilter = workflowId
      ? `&workflow_id=eq.${encodeURIComponent(workflowId)}`
      : "";
    const response = await fetch(
      `${base}?owner_id=eq.${encodeURIComponent(ownerId)}${workflowFilter}&order=updated_at.desc`,
      { headers: headers(key) },
    );
    const rows = await readResponse<SupabaseMatterRow[]>(response);
    return rows.map(fromRow);
  }

  async update(
    ownerId: string,
    matterId: string,
    expectedVersion: number,
    patch: Partial<PrivateOfficeMatter>,
  ): Promise<PrivateOfficeMatter> {
    const { base, key } = config();
    const allowed: Record<string, unknown> = {};
    for (const field of [
      "documentId",
      "title",
      "providerOrderId",
      "trackingNumber",
      "proofHash",
      "draftHash",
      "approvedDraftHash",
    ] as const) {
      if (field in patch) {
        const snakeKey = field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
        allowed[snakeKey] = patch[field];
      }
    }
    const payload = {
      ...allowed,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    };
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&version=eq.${expectedVersion}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok)
      throw new Error(`Supabase matter update failed with status ${response.status}`);
    const rows = (await response.json()) as SupabaseMatterRow[];
    if (!rows[0]) throw new MatterVersionConflictError();
    return fromRow(rows[0]);
  }

  async transition(
    ownerId: string,
    matterId: string,
    expectedVersion: number,
    next: MatterStatus,
    fields: Partial<
      Pick<
        PrivateOfficeMatter,
        | "providerOrderId"
        | "trackingNumber"
        | "proofHash"
        | "draftHash"
        | "approvedDraftHash"
      >
    > = {},
  ): Promise<PrivateOfficeMatter> {
    const current = await this.get(ownerId, matterId);
    if (!current) throw new MatterOwnershipError();
    if (current.version !== expectedVersion)
      throw new MatterVersionConflictError();
    if (!canTransitionMatter(current.status, next))
      throw new Error(`Invalid matter transition: ${current.status} -> ${next}`);
    const nextMatter = transitionMatter(
      current,
      next,
      new Date().toISOString(),
      fields,
    );
    return this.update(ownerId, matterId, expectedVersion, {
      documentId: nextMatter.documentId,
      title: nextMatter.title,
      providerOrderId: nextMatter.providerOrderId,
      trackingNumber: nextMatter.trackingNumber,
      proofHash: nextMatter.proofHash,
      draftHash: nextMatter.draftHash,
      approvedDraftHash: nextMatter.approvedDraftHash,
    });
  }
}

export const supabaseMatterRepository = new SupabaseMatterRepository();
