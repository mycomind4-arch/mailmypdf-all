-- A purchase unlocks drafting; it is not an authorization to mail.
-- Keeping this separate from mailings prevents a Stripe completion event from
-- being mistaken for final customer approval.
CREATE TABLE IF NOT EXISTS appeal_payment_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES appeals(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('checkout_open', 'paid', 'draft_ready', 'approved', 'submitted', 'expired', 'refunded')),
  mailing_method TEXT NOT NULL CHECK (mailing_method IN ('standard', 'certified', 'registered')),
  quote_total_cents INTEGER NOT NULL CHECK (quote_total_cents > 0),
  quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appeal_id)
);

CREATE INDEX IF NOT EXISTS idx_appeal_payment_gates_owner ON appeal_payment_gates(owner_id);
CREATE INDEX IF NOT EXISTS idx_appeal_payment_gates_session ON appeal_payment_gates(stripe_session_id);

ALTER TABLE appeal_payment_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own appeal payment gates" ON appeal_payment_gates
  FOR SELECT USING (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS appeal_payment_gates_updated_at ON appeal_payment_gates;
CREATE TRIGGER appeal_payment_gates_updated_at BEFORE UPDATE ON appeal_payment_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
