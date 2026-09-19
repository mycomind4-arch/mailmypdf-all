
CREATE TYPE public.order_status AS ENUM (
  'draft','paid','submitted_to_provider','provider_processing','mailed','in_transit','delivered','failed'
);

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lookup_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_line1 TEXT NOT NULL,
  sender_line2 TEXT,
  sender_city TEXT NOT NULL,
  sender_state TEXT NOT NULL,
  sender_postal TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_line1 TEXT NOT NULL,
  recipient_line2 TEXT,
  recipient_city TEXT NOT NULL,
  recipient_state TEXT NOT NULL,
  recipient_postal TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  pdf_storage_path TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  status public.order_status NOT NULL DEFAULT 'draft',
  stripe_session_id TEXT,
  lob_letter_id TEXT,
  paid_at TIMESTAMPTZ,
  mailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.orders TO service_role;
-- No anon/authenticated grants: all reads/writes go through server functions using the service-role client.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- No policies: table is only reachable via server functions with service_role.

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX orders_stripe_session_idx ON public.orders (stripe_session_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX order_events_order_id_idx ON public.order_events (order_id, created_at);
