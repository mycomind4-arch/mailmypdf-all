-- Notice Respond operational-readiness migration
-- Idempotent schema alignment for durable cases, immutable approvals,
-- payment/fulfillment state, and private evidence storage.

BEGIN;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS workflow_id TEXT NOT NULL DEFAULT 'analyze';

ALTER TABLE mailing_intents
  ADD COLUMN IF NOT EXISTS case_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS quote_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS approval_id UUID,
  ADD COLUMN IF NOT EXISTS approved_draft_hash TEXT,
  ADD COLUMN IF NOT EXISTS approved_recipient_hash TEXT,
  ADD COLUMN IF NOT EXISTS evidence_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS approved_evidence_hash TEXT;

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  draft_hash TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  evidence_hash TEXT NOT NULL DEFAULT '',
  draft TEXT NOT NULL,
  recipient JSONB NOT NULL,
  review_state JSONB NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);

ALTER TABLE approvals
  ADD COLUMN IF NOT EXISTS evidence_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS approvals_owner_idx ON approvals(owner_id);
CREATE INDEX IF NOT EXISTS approvals_case_idx ON approvals(case_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);
CREATE INDEX IF NOT EXISTS cases_workflow_id_idx ON cases(workflow_id);
CREATE INDEX IF NOT EXISTS mailing_intents_case_idx ON mailing_intents(case_id);
CREATE UNIQUE INDEX IF NOT EXISTS mailing_intents_stripe_session_uidx
  ON mailing_intents(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS approvals_select_own ON approvals;
CREATE POLICY approvals_select_own
  ON approvals FOR SELECT
  USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS approvals_insert_own ON approvals;
CREATE POLICY approvals_insert_own
  ON approvals FOR INSERT
  WITH CHECK (auth.uid()::text = owner_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-evidence', 'notice-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMIT;
