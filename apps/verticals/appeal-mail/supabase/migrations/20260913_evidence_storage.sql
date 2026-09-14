-- Appeal Mail: private evidence storage bucket.
--
-- Mirrors Notice Respond's proven pattern for retaining approved evidence
-- bytes so they can be re-attached to the mail-ready packet at fulfillment
-- time (see apps/verticals/notice-respond/supabase/migrations/20260910190000_operational_readiness.sql
-- and apps/verticals/notice-respond/src/platform/fulfillment-adapter.ts's
-- uploadPacket()). Evidence metadata (storagePath/fileHash/fileType/fileSize)
-- lives on the existing `appeals.evidence` JSONB column -- no table columns
-- are added here, only the bucket evidence bytes are stored in.
--
-- Access is server-only (the service-role key bypasses RLS), matching the
-- private, non-public bucket Notice Respond uses for the same purpose.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('appeal-evidence', 'appeal-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;

COMMIT;
