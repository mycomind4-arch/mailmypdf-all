-- Persist the evidence needed to reconstruct a consumer mailing record.
-- Existing orders remain valid; document_sha256 is populated for new orders.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS document_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_tracking_event JSONB;

CREATE INDEX IF NOT EXISTS orders_tracking_number_idx
  ON public.orders (tracking_number)
  WHERE tracking_number IS NOT NULL;

COMMENT ON COLUMN public.orders.document_sha256 IS
  'SHA-256 of the exact PDF bytes accepted for this mailing.';
COMMENT ON COLUMN public.orders.tracking_number IS
  'Carrier tracking number returned by the mail provider when available.';
COMMENT ON COLUMN public.orders.expected_delivery_date IS
  'Provider-reported expected delivery date.';
COMMENT ON COLUMN public.orders.delivered_at IS
  'Timestamp recorded when a verified provider event reports delivery.';
COMMENT ON COLUMN public.orders.last_tracking_event IS
  'Minimal normalized metadata for the latest processed provider tracking event.';
