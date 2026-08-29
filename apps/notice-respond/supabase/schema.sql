-- ═══════════════════════════════════════════════════════════
-- NOTICE RESPOND — Database Schema with Row Level Security
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  notice_type TEXT DEFAULT 'other',
  agency TEXT,
  reference_number TEXT,
  notice_date TEXT,
  readiness_score INTEGER DEFAULT 0,
  health_status TEXT DEFAULT 'incomplete',
  deadline_date TEXT,
  has_draft BOOLEAN DEFAULT false,
  has_mailing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS cases_owner_id_idx ON cases(owner_id);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_owner_status_idx ON cases(owner_id, status);
CREATE INDEX IF NOT EXISTS cases_updated_at_idx ON cases(updated_at DESC);

CREATE TABLE IF NOT EXISTS audit_entries (
  id UUID PRIMARY KEY,
  case_id TEXT,
  owner_id TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  object_type TEXT,
  description TEXT,
  result TEXT DEFAULT 'success',
  is_security_event BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now(),
  data JSONB
);

CREATE INDEX IF NOT EXISTS audit_entries_case_id_idx ON audit_entries(case_id);
CREATE INDEX IF NOT EXISTS audit_entries_owner_id_idx ON audit_entries(owner_id);
CREATE INDEX IF NOT EXISTS audit_entries_action_idx ON audit_entries(action);

-- Payment/mailing intents are created server-side before Stripe Checkout.
-- They are the durable bridge across the Stripe redirect.
CREATE TABLE IF NOT EXISTS mailing_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mailing_method TEXT NOT NULL,
  draft TEXT NOT NULL,
  recipient JSONB NOT NULL,
  matter_reference TEXT,
  matter_type TEXT NOT NULL DEFAULT 'notice-respond',
  provider_order_id TEXT,
  tracking_number TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mailing_intents_owner_idx ON mailing_intents(owner_id);
CREATE INDEX IF NOT EXISTS mailing_intents_status_idx ON mailing_intents(status);
CREATE INDEX IF NOT EXISTS mailing_intents_stripe_idx ON mailing_intents(stripe_session_id);
CREATE INDEX IF NOT EXISTS mailing_intents_provider_idx ON mailing_intents(provider_order_id);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailing_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cases_select_own ON cases;
CREATE POLICY cases_select_own ON cases FOR SELECT USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS cases_insert_own ON cases;
CREATE POLICY cases_insert_own ON cases FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS cases_update_own ON cases;
CREATE POLICY cases_update_own ON cases FOR UPDATE USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS cases_delete_own ON cases;
CREATE POLICY cases_delete_own ON cases FOR DELETE USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS audit_select_own ON audit_entries;
CREATE POLICY audit_select_own ON audit_entries FOR SELECT USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS audit_insert_own ON audit_entries;
CREATE POLICY audit_insert_own ON audit_entries FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS mailing_intents_select_own ON mailing_intents;
CREATE POLICY mailing_intents_select_own ON mailing_intents FOR SELECT USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS mailing_intents_insert_own ON mailing_intents;
CREATE POLICY mailing_intents_insert_own ON mailing_intents FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS mailing_intents_update_own ON mailing_intents;
CREATE POLICY mailing_intents_update_own ON mailing_intents FOR UPDATE USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mailing_intents_updated_at ON mailing_intents;
CREATE TRIGGER mailing_intents_updated_at BEFORE UPDATE ON mailing_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION prevent_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Cannot change owner_id after case creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_prevent_owner_change ON cases;
CREATE TRIGGER cases_prevent_owner_change BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION prevent_owner_change();

CREATE OR REPLACE FUNCTION prevent_mailing_intent_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Cannot change owner_id on mailing intent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mailing_intents_prevent_owner_change ON mailing_intents;
CREATE TRIGGER mailing_intents_prevent_owner_change BEFORE UPDATE ON mailing_intents FOR EACH ROW EXECUTE FUNCTION prevent_mailing_intent_owner_change();

-- ═══════════════════════════════════════════════════════════
-- APPROVAL GATE — Server-side consequential-action boundary
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  draft_hash TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  draft TEXT NOT NULL,
  recipient JSONB NOT NULL,
  review_state JSONB NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS approvals_owner_idx ON approvals(owner_id);
CREATE INDEX IF NOT EXISTS approvals_case_idx ON approvals(case_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_select_own ON approvals;
CREATE POLICY approvals_select_own ON approvals FOR SELECT USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS approvals_insert_own ON approvals;
CREATE POLICY approvals_insert_own ON approvals FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

-- Add approval reference to mailing_intents
ALTER TABLE mailing_intents ADD COLUMN IF NOT EXISTS approval_id UUID REFERENCES approvals(id);
ALTER TABLE mailing_intents ADD COLUMN IF NOT EXISTS approved_draft_hash TEXT;
ALTER TABLE mailing_intents ADD COLUMN IF NOT EXISTS approved_recipient_hash TEXT;

-- RLS for the new columns is inherited from the existing mailing_intents policies.
