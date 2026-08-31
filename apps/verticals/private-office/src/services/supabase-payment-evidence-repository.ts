/**
 * Supabase payment evidence repository.
 *
 * Stores payment evidence in the `private_office_payment_evidence` table.
 * Uses the Supabase REST API with the service-role key (server-only).
 *
 * RLS: The table must enforce that only the owner can read their own
 * payment evidence. The service-role key bypasses RLS for server-side
 * operations (webhook handling, verification).
 *
 * Schema (SQL migration required):
 *   CREATE TABLE private_office_payment_evidence (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     owner_id TEXT NOT NULL,
 *     matter_id TEXT NOT NULL,
 *     workflow_id TEXT NOT NULL,
 *     stripe_session_id TEXT NOT NULL UNIQUE,
 *     stripe_payment_intent_id TEXT NOT NULL,
 *     amount BIGINT NOT NULL,
 *     currency TEXT NOT NULL,
 *     status TEXT NOT NULL DEFAULT 'pending',
 *     verified_at TIMESTAMPTZ,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE private_office_payment_evidence ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY owner_read ON private_office_payment_evidence
 *     FOR SELECT USING (auth.uid()::text = owner_id);
 *   -- Only service-role can INSERT/UPDATE (webhook handler, checkout creation).
 */

import {
  type PaymentEvidence,
  type PaymentEvidenceStatus,
  type CreatePaymentEvidenceInput,
  type PaymentEvidenceRepository,
  PaymentEvidenceError,
  PaymentEvidenceNotFoundError,
  PaymentEvidenceAlreadyVerifiedError,
} from "@/domain/payment-evidence";

interface PaymentEvidenceRow {
  id: string;
  owner_id: string;
  matter_id: string;
  workflow_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase payment evidence persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  return {
    base: `${url.replace(/\/$/, "")}/rest/v1/private_office_payment_evidence`,
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

function fromRow(row: PaymentEvidenceRow): PaymentEvidence {
  return {
    id: row.id,
    ownerId: row.owner_id,
    matterId: row.matter_id,
    workflowId: row.workflow_id as PaymentEvidence["workflowId"],
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as PaymentEvidenceStatus,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabasePaymentEvidenceRepository
  implements PaymentEvidenceRepository
{
  async create(input: CreatePaymentEvidenceInput): Promise<PaymentEvidence> {
    const { base, key } = config();
    const now = new Date().toISOString();
    const row = {
      owner_id: input.ownerId,
      matter_id: input.matterId,
      workflow_id: input.workflowId,
      stripe_session_id: input.stripeSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      verified_at: null,
      created_at: now,
      updated_at: now,
    };
    const response = await fetch(base, {
      method: "POST",
      headers: headers(key, { Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new PaymentEvidenceError(
        `Failed to create payment evidence (${response.status}): ${text}`,
        "CREATE_FAILED",
      );
    }
    const created = (await response.json()) as PaymentEvidenceRow[];
    if (!created[0])
      throw new PaymentEvidenceError(
        "Supabase did not return the created payment evidence",
        "CREATE_EMPTY",
      );
    return fromRow(created[0]);
  }

  async findBySessionId(
    stripeSessionId: string,
  ): Promise<PaymentEvidence | null> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as PaymentEvidenceRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async findByMatter(
    ownerId: string,
    matterId: string,
  ): Promise<PaymentEvidence | null> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?owner_id=eq.${encodeURIComponent(ownerId)}&matter_id=eq.${encodeURIComponent(matterId)}&order=created_at.desc&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as PaymentEvidenceRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async markVerified(
    stripeSessionId: string,
    stripePaymentIntentId: string,
  ): Promise<PaymentEvidence> {
    const existing = await this.findBySessionId(stripeSessionId);
    if (!existing) throw new PaymentEvidenceNotFoundError();

    // Idempotent: already verified
    if (existing.status === "verified") return existing;

    // Cannot verify a failed payment
    if (existing.status === "failed")
      throw new PaymentEvidenceError(
        "Cannot verify a payment that was previously marked as failed.",
        "CANNOT_VERIFY_FAILED",
      );

    const { base, key } = config();
    const now = new Date().toISOString();
    const response = await fetch(
      `${base}?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          status: "verified",
          stripe_payment_intent_id: stripePaymentIntentId,
          verified_at: now,
          updated_at: now,
        }),
      },
    );
    if (!response.ok)
      throw new PaymentEvidenceError(
        `Failed to mark payment evidence as verified (${response.status})`,
        "UPDATE_FAILED",
      );
    const rows = (await response.json()) as PaymentEvidenceRow[];
    if (!rows[0])
      throw new PaymentEvidenceError(
        "Supabase did not return the updated payment evidence",
        "UPDATE_EMPTY",
      );
    return fromRow(rows[0]);
  }

  async markFailed(
    stripeSessionId: string,
    _reason: string,
  ): Promise<PaymentEvidence> {
    const existing = await this.findBySessionId(stripeSessionId);
    if (!existing) throw new PaymentEvidenceNotFoundError();

    // Cannot fail an already-verified payment
    if (existing.status === "verified")
      throw new PaymentEvidenceAlreadyVerifiedError();

    // Idempotent: already failed
    if (existing.status === "failed") return existing;

    const { base, key } = config();
    const now = new Date().toISOString();
    const response = await fetch(
      `${base}?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`,
      {
        method: "PATCH",
        headers: headers(key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          status: "failed",
          updated_at: now,
        }),
      },
    );
    if (!response.ok)
      throw new PaymentEvidenceError(
        `Failed to mark payment evidence as failed (${response.status})`,
        "UPDATE_FAILED",
      );
    const rows = (await response.json()) as PaymentEvidenceRow[];
    if (!rows[0])
      throw new PaymentEvidenceError(
        "Supabase did not return the updated payment evidence",
        "UPDATE_EMPTY",
      );
    return fromRow(rows[0]);
  }
}

export const supabasePaymentEvidenceRepository =
  new SupabasePaymentEvidenceRepository();
