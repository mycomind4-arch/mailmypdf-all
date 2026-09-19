
-- Extend order_status enum with new manual fulfillment states
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'uploaded';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'priced';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'checkout_created';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid_pending_manual_fulfillment';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'manual_fulfillment_in_progress';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed_payment';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed_fulfillment';

-- App roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin notes column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes text;

-- Admin RLS on orders + order_events (server uses service_role, but this lets an admin read via authenticated client if we ever want)
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all order events" ON public.order_events;
CREATE POLICY "Admins can view all order events"
  ON public.order_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
