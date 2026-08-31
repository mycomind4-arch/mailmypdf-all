-- Add support for: color printing, delivery speed tiers, letter text (editor),
-- and scheduled delivery (future-self feature).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS color BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mail_class TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS letter_text TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_delivery_date TIMESTAMPTZ;

-- Index for scheduled delivery queries (future-self feature)
CREATE INDEX IF NOT EXISTS orders_scheduled_delivery_idx
  ON public.orders (scheduled_delivery_date)
  WHERE scheduled_delivery_date IS NOT NULL AND status = 'paid_pending_manual_fulfillment';
