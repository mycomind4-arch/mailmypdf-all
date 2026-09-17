import type { AuditEvent, AuditEventType, CreateAuditEventInput } from "./event";
import { createAuditEvent } from "./event";
import type { AuditRepository } from "./repository";

type AuditRow = {
  id: string;
  owner_id: string;
  matter_id: string;
  workflow_id: string;
  vertical_id: string | null;
  event_type: AuditEventType;
  actor: AuditEvent["actor"];
  detail: string;
  metadata: Record<string, unknown> | null;
  artifacts: AuditEvent["artifacts"] | null;
  created_at: string;
};

function headers(key: string): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    prefer: "return=representation",
  };
}

function fromRow(row: AuditRow): AuditEvent {
  return Object.freeze({
    id: row.id,
    ownerId: row.owner_id,
    matterId: row.matter_id,
    workflowId: row.workflow_id,
    verticalId: row.vertical_id ?? undefined,
    type: row.event_type,
    timestamp: row.created_at,
    actor: Object.freeze({ ...row.actor }),
    detail: row.detail,
    metadata: row.metadata ? Object.freeze({ ...row.metadata }) : undefined,
    artifacts: row.artifacts?.map((artifact) => Object.freeze({ ...artifact })),
  });
}

async function rows(response: Response): Promise<AuditRow[]> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase audit persistence failed with status ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json() as Promise<AuditRow[]>;
}

export class SupabaseAuditRepository implements AuditRepository {
  private readonly url: string;
  private readonly key: string;

  constructor(config: { supabaseUrl: string; serviceRoleKey: string; tableName?: string }) {
    const root = config.supabaseUrl.replace(/\/$/, "");
    const table = config.tableName?.trim() || "workflow_audit_events";
    this.url = `${root}/rest/v1/${table}`;
    this.key = config.serviceRoleKey;
  }

  async append(input: CreateAuditEventInput): Promise<AuditEvent> {
    const event = createAuditEvent(input);
    const response = await fetch(this.url, {
      method: "POST",
      headers: headers(this.key),
      body: JSON.stringify({
        id: event.id,
        owner_id: event.ownerId,
        matter_id: event.matterId,
        workflow_id: event.workflowId,
        vertical_id: event.verticalId ?? null,
        event_type: event.type,
        actor: event.actor,
        detail: event.detail,
        metadata: event.metadata ?? {},
        artifacts: event.artifacts ?? [],
        created_at: event.timestamp,
      }),
    });
    const result = await rows(response);
    if (!result[0]) throw new Error("Supabase did not return the appended audit event.");
    return fromRow(result[0]);
  }

  async listMatter(ownerId: string, matterId: string): Promise<AuditEvent[]> {
    const response = await fetch(
      `${this.url}?owner_id=eq.${encodeURIComponent(ownerId)}&matter_id=eq.${encodeURIComponent(matterId)}&order=created_at.asc`,
      { headers: headers(this.key) },
    );
    return (await rows(response)).map(fromRow);
  }

  async listByType(ownerId: string, matterId: string, type: AuditEventType): Promise<AuditEvent[]> {
    const response = await fetch(
      `${this.url}?owner_id=eq.${encodeURIComponent(ownerId)}&matter_id=eq.${encodeURIComponent(matterId)}&event_type=eq.${encodeURIComponent(type)}&order=created_at.asc`,
      { headers: headers(this.key) },
    );
    return (await rows(response)).map(fromRow);
  }

  async hasEvent(ownerId: string, matterId: string, type: AuditEventType): Promise<boolean> {
    return (await this.listByType(ownerId, matterId, type)).length > 0;
  }

  static readonly sqlTemplate = `
create table if not exists public.workflow_audit_events (
  id uuid primary key,
  owner_id uuid not null,
  matter_id uuid not null,
  workflow_id text not null,
  vertical_id text,
  event_type text not null,
  actor jsonb not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists workflow_audit_events_owner_matter_created_idx
  on public.workflow_audit_events(owner_id, matter_id, created_at);
`;
}
