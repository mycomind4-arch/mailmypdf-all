import {
  type ClaimMailingIntentInput,
  type ClaimResult,
  type MailingIntent,
  type MailingIntentRepository,
  type MailingIntentStatus,
  MailingIntentConflictError,
} from "@/domain/mailing-intent-repository";

interface IntentRow {
  id: string;
  owner_id: string;
  workflow_id: string;
  matter_id: string | null;
  status: string;
  mailing_method: string;
  draft_hash: string;
  provider_order_id: string | null;
  tracking_number: string | null;
  idempotency_key: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase mailing intent persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  return {
    base: `${url.replace(/\/$/, "")}/rest/v1/private_office_mailing_intents`,
    key,
  };
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

function fromRow(row: IntentRow): MailingIntent {
  return {
    id: row.id,
    ownerId: row.owner_id,
    workflowId: row.workflow_id,
    matterId: row.matter_id,
    status: row.status as MailingIntentStatus,
    mailingMethod: row.mailing_method,
    draftHash: row.draft_hash,
    providerOrderId: row.provider_order_id,
    trackingNumber: row.tracking_number,
    idempotencyKey: row.idempotency_key,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseMailingIntentRepository implements MailingIntentRepository {
  async claim(input: ClaimMailingIntentInput): Promise<ClaimResult> {
    const { base, key } = config();
    const now = new Date().toISOString();
    const row = {
      owner_id: input.ownerId,
      workflow_id: input.workflowId,
      matter_id: input.matterId ?? null,
      status: "pending",
      mailing_method: input.mailingMethod,
      draft_content: input.draftContent,
      draft_hash: input.draftHash,
      recipient: JSON.stringify(input.recipient),
      matter_reference: input.matterReference ?? input.workflowId,
      matter_type: input.matterType,
      stripe_payment_intent_id: input.stripePaymentId,
      idempotency_key: input.idempotencyKey,
      error_message: null,
      created_at: now,
      updated_at: now,
    };

    // Try INSERT. If it succeeds, this caller owns the slot.
    const response = await fetch(base, {
      method: "POST",
      headers: headers(key, { Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });

    if (response.ok) {
      const rows = (await response.json()) as IntentRow[];
      if (rows[0]) {
        return { intent: fromRow(rows[0]), isNew: true };
      }
    }

    // INSERT failed — likely unique constraint violation on (idempotency_key, owner_id).
    // Fetch the existing intent to determine what to do.
    const existing = await this.get(input.idempotencyKey, input.ownerId);
    if (!existing)
      throw new Error(
        `Mailing intent insert failed (${response.status}) and no existing intent was found`,
      );

    if (existing.status === "submitted") {
      // Already submitted — return cached result (idempotent)
      return { intent: existing, isNew: false };
    }

    if (existing.status === "pending") {
      // Another request is in progress
      throw new MailingIntentConflictError();
    }

    if (existing.status === "failed") {
      // Reclaim: update to pending so this caller can retry
      await this.updateStatus(
        input.idempotencyKey,
        input.ownerId,
        "pending",
        { error_message: null },
      );
      const reclaimed = await this.get(input.idempotencyKey, input.ownerId);
      return { intent: reclaimed ?? existing, isNew: true };
    }

    // cancelled or unknown — throw
    throw new MailingIntentConflictError();
  }

  async markSubmitted(
    idempotencyKey: string,
    ownerId: string,
    providerOrderId: string,
    trackingNumber?: string,
  ): Promise<void> {
    await this.updateStatus(idempotencyKey, ownerId, "submitted", {
      provider_order_id: providerOrderId,
      tracking_number: trackingNumber ?? null,
      error_message: null,
    });
  }

  async markFailed(
    idempotencyKey: string,
    ownerId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.updateStatus(idempotencyKey, ownerId, "failed", {
      error_message: errorMessage,
    });
  }

  private async get(
    idempotencyKey: string,
    ownerId: string,
  ): Promise<MailingIntent | null> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as IntentRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  private async updateStatus(
    idempotencyKey: string,
    ownerId: string,
    status: MailingIntentStatus,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const { base, key } = config();
    const payload = {
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const response = await fetch(
      `${base}?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=minimal" }),
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok)
      throw new Error(
        `Mailing intent status update failed: ${response.status}`,
      );
  }
}

export const supabaseMailingIntentRepository = new SupabaseMailingIntentRepository();
