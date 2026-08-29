import {
  type CreateEventInput,
  type MatterEvent,
  type MatterEventRepository,
  validateEventType,
} from "@/domain/event-repository";

interface EventRow {
  id: string;
  matter_id: string;
  owner_id: string;
  event_type: string;
  actor_id: string | null;
  metadata: unknown;
  created_at: string;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase event persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  return { base: `${url.replace(/\/$/, "")}/rest/v1/private_office_events`, key };
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

function fromRow(row: EventRow): MatterEvent {
  return {
    id: row.id,
    matterId: row.matter_id,
    ownerId: row.owner_id,
    eventType: row.event_type as MatterEvent["eventType"],
    actorId: row.actor_id,
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export class SupabaseEventRepository implements MatterEventRepository {
  async record(input: CreateEventInput): Promise<MatterEvent> {
    validateEventType(input.eventType);
    if (!input.ownerId.trim()) throw new Error("ownerId is required");
    if (!input.matterId.trim()) throw new Error("matterId is required");

    const { base, key } = config();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      matter_id: input.matterId,
      owner_id: input.ownerId,
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
      created_at: now,
    };

    const response = await fetch(base, {
      method: "POST",
      headers: headers(key, { Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });
    if (!response.ok)
      throw new Error(`Supabase event recording failed: ${response.status}`);
    const rows = (await response.json()) as EventRow[];
    if (!rows[0])
      throw new Error("Supabase did not return the recorded event");
    return fromRow(rows[0]);
  }

  async list(ownerId: string, matterId: string): Promise<MatterEvent[]> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?matter_id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.asc`,
      { headers: headers(key) },
    );
    if (!response.ok)
      throw new Error(`Supabase event list failed: ${response.status}`);
    const rows = (await response.json()) as EventRow[];
    return rows.map(fromRow);
  }
}

export const supabaseEventRepository = new SupabaseEventRepository();
