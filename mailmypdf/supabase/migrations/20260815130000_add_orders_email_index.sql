-- Add index on orders.email for the recovery email lookup
-- The recovery function (recovery.functions.ts) queries orders by email with .ilike()
-- Without this index, the query full-scans as the table grows

CREATE INDEX IF NOT EXISTS orders_email_idx ON public.orders (email);

-- Also add an index on lookup_token for order lookups (may already exist via UNIQUE constraint
-- but this makes the intent explicit and covers case-insensitive lookups)
CREATE INDEX IF NOT EXISTS orders_lookup_token_idx ON public.orders (lookup_token);
