-- Migration: Add rate_limits column to proof_tenants
-- Allows per-tenant custom rate limit overrides.
-- Default limits are hardcoded in the rate-limiting module; this column
-- allows overriding them per tenant (e.g., higher limits for enterprise tenants).

ALTER TABLE public.proof_tenants
  ADD COLUMN IF NOT EXISTS rate_limits JSONB DEFAULT NULL;

-- Example: { "documents.upload": { "maxRequests": 200, "windowMs": 60000 } }

COMMENT ON COLUMN public.proof_tenants.rate_limits IS
  'Per-tenant rate limit overrides. NULL = use defaults. Format: { "bucket_name": { "maxRequests": N, "windowMs": M } }';
