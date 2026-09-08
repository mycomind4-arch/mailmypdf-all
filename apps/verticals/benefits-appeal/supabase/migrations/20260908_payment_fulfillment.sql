-- Immutable, server-created approvals and their payment/fulfillment state.
-- Existing appeals/mailings remain untouched. Apply before deploying routes.
CREATE TABLE IF NOT EXISTS public.mailing_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  case_id uuid NOT NULL REFERENCES public.appeals(id),
  workflow_id text NOT NULL,
  draft_content text NOT NULL,
  recipient jsonb NOT NULL,
  mailing_method text NOT NULL CHECK (mailing_method IN ('first_class','certified','registered')),
  approved_draft_hash text NOT NULL,
  approved_recipient_hash text NOT NULL,
  review jsonb NOT NULL,
  matter_reference text,
  matter_type text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_price_cents integer CHECK (stripe_price_cents > 0),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','paid','submitted','tracking','delivered','failed','expired','refunded')),
  provider_order_id text,
  tracking_number text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS benefits_intents_case ON public.mailing_intents(case_id);
ALTER TABLE public.mailing_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read mailing intents" ON public.mailing_intents;
CREATE POLICY "Owners read mailing intents" ON public.mailing_intents FOR SELECT TO authenticated USING (owner_id = auth.uid());
-- Clients cannot forge approvals, payment state, or provider proof.
REVOKE ALL ON public.mailing_intents FROM anon, authenticated;
GRANT SELECT ON public.mailing_intents TO authenticated;
GRANT ALL ON public.mailing_intents TO service_role;
CREATE OR REPLACE FUNCTION public.protect_benefits_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.owner_id, NEW.case_id, NEW.workflow_id, NEW.draft_content, NEW.recipient, NEW.mailing_method,
         NEW.approved_draft_hash, NEW.approved_recipient_hash, NEW.review)
     IS DISTINCT FROM ROW(OLD.owner_id, OLD.case_id, OLD.workflow_id, OLD.draft_content, OLD.recipient, OLD.mailing_method,
         OLD.approved_draft_hash, OLD.approved_recipient_hash, OLD.review) THEN
    RAISE EXCEPTION 'Approved mailing content is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_benefits_approval ON public.mailing_intents;
CREATE TRIGGER protect_benefits_approval BEFORE UPDATE ON public.mailing_intents FOR EACH ROW EXECUTE FUNCTION public.protect_benefits_approval();
