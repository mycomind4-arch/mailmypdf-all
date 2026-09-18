-- Adds a nullable draft-basis fingerprint to case_drafts so the shared
-- workflow-runtime host can detect when a saved draft has gone stale
-- (analysis, workflow facts, or included documents changed after the
-- draft was written) before allowing packet construction. Existing rows
-- are left with a null basis and are treated as stale by the runtime
-- host until reviewed and saved again — no existing column is altered
-- or removed, and no existing behavior on /api/v2/cases/* changes,
-- since that surface never reads this column.

alter table public.case_drafts
  add column if not exists basis jsonb null;
