-- Prevent duplicate physical mailings when a caller retries a communication request.
-- The idempotency key is scoped to a tenant so separate tenants may reuse keys.

ALTER TABLE public.proof_communications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS proof_communications_tenant_idempotency_idx
  ON public.proof_communications (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
