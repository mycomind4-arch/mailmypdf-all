/**
 * Supabase LLM Provenance Repository
 *
 * Persists LLM provenance records to the private_office_llm_provenance table.
 * Uses the service role key for server-side writes — client RLS is read-only.
 *
 * Security:
 *   - Only stores hashes and structured metadata, never raw prompts or documents
 *   - Writes go through the service role (server-side only)
 *   - Client can only read their own records (RLS enforced)
 */

import type { LLMFullProvenance, LLMProviderId, LLMOperation } from "@/platform/llm-types";

export interface LLMProvenanceRecord {
  id: string;
  ownerId: string;
  matterId: string | null;
  operation: LLMOperation;
  provider: LLMProviderId;
  model: string;
  promptVersion: string;
  inputHash: string;
  outputHash: string;
  status: "accepted" | "rejected" | "failed";
  fallbackUsed: boolean;
  fallbackChain: string[];
  workflowId: string;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface LLMProvenanceRepository {
  record(provenance: LLMFullProvenance, ownerId: string, status: LLMProvenanceRecord["status"], error?: string | null): Promise<void>;
  listByMatter(matterId: string, ownerId: string): Promise<LLMProvenanceRecord[]>;
}

// ── Supabase implementation ──────────────────────────────────────────────

interface ProvenanceRow {
  id: string;
  owner_id: string;
  matter_id: string | null;
  operation: string;
  provider: string;
  model: string;
  prompt_version: string;
  input_hash: string;
  output_hash: string;
  status: string;
  fallback_used: boolean;
  fallback_chain: string[];
  workflow_id: string;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    base: `${url.replace(/\/$/, "")}/rest/v1/private_office_llm_provenance`,
    key,
  };
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

function fromRow(row: ProvenanceRow): LLMProvenanceRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    matterId: row.matter_id,
    operation: row.operation as LLMOperation,
    provider: row.provider as LLMProviderId,
    model: row.model,
    promptVersion: row.prompt_version,
    inputHash: row.input_hash,
    outputHash: row.output_hash,
    status: row.status as LLMProvenanceRecord["status"],
    fallbackUsed: row.fallback_used,
    fallbackChain: row.fallback_chain,
    workflowId: row.workflow_id,
    durationMs: row.duration_ms,
    error: row.error,
    createdAt: row.created_at,
  };
}

export class SupabaseLLMProvenanceRepository implements LLMProvenanceRepository {
  async record(
    provenance: LLMFullProvenance,
    ownerId: string,
    status: LLMProvenanceRecord["status"],
    error: string | null = null,
  ): Promise<void> {
    const cfg = config();
    if (!cfg) return; // No-op if Supabase not configured

    const row = {
      owner_id: ownerId,
      matter_id: provenance.matterId ?? null,
      operation: provenance.operation,
      provider: provenance.provider,
      model: provenance.model,
      prompt_version: provenance.promptVersion,
      input_hash: provenance.inputHash,
      output_hash: provenance.outputHash,
      status,
      fallback_used: provenance.fallbackUsed,
      fallback_chain: provenance.fallbackChain,
      workflow_id: provenance.workflowId ?? "",
      duration_ms: provenance.durationMs ?? null,
      error,
    };

    const resp = await fetch(cfg.base, {
      method: "POST",
      headers: headers(cfg.key, { Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });

    if (!resp.ok) {
      // Log but don't throw — provenance recording should never break the workflow
      console.error("[llm-provenance] Failed to record:", resp.status, await resp.text());
    }
  }

  async listByMatter(matterId: string, ownerId: string): Promise<LLMProvenanceRecord[]> {
    const cfg = config();
    if (!cfg) return [];

    const resp = await fetch(
      `${cfg.base}?matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc`,
      { headers: headers(cfg.key) },
    );

    if (!resp.ok) return [];

    const rows: ProvenanceRow[] = await resp.json();
    return rows.map(fromRow);
  }
}

// ── No-op implementation (for tests / when Supabase is not configured) ────

export class NoopLLMProvenanceRepository implements LLMProvenanceRepository {
  async record(): Promise<void> {}
  async listByMatter(): Promise<LLMProvenanceRecord[]> {
    return [];
  }
}

// ── Singleton ────────────────────────────────────────────────────────────

let _instance: LLMProvenanceRepository | null = null;

export function getLLMProvenanceRepository(): LLMProvenanceRepository {
  if (_instance) return _instance;
  _instance = config()
    ? new SupabaseLLMProvenanceRepository()
    : new NoopLLMProvenanceRepository();
  return _instance;
}

export function _setLLMProvenanceRepository(repo: LLMProvenanceRepository | null): void {
  _instance = repo;
}
