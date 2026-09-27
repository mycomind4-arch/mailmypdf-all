-- Forward hardening for installations where rate_limit_buckets already exists.
-- This table contains abuse-control state and is intended for server-only access.

REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limit_buckets TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Intentionally no anon/authenticated policies. The service-role backend is
-- the only application caller and bypasses RLS.
