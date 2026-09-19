-- Add vertical metadata columns to orders table.
-- Allows any vertical (Dispute Mail, Notice Respond, etc.) to tag orders
-- with their origin vertical and store vertical-specific context
-- without creating separate tables per vertical.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vertical_slug TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vertical_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for filtering orders by vertical (admin dashboards, analytics)
CREATE INDEX IF NOT EXISTS orders_vertical_slug_idx
  ON public.orders (vertical_slug)
  WHERE vertical_slug IS NOT NULL;

-- Add vertical_slug to order_events for audit trail
ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS vertical_slug TEXT;
