-- Distributed rate limiting table
-- Used by distributed-rate-limit.ts for cross-isolate rate coordination

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL UNIQUE,
  timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by bucket_key (the UNIQUE constraint already creates one,
-- but this makes the intent explicit)
CREATE INDEX IF NOT EXISTS rate_limit_buckets_bucket_key_idx
  ON rate_limit_buckets (bucket_key);

-- Auto-cleanup: rows older than 2 hours with no recent activity can be pruned
-- (the application handles this via the cleanup endpoint)

COMMENT ON TABLE rate_limit_buckets IS
'Distributed rate limiting buckets for cross-isolate coordination on Cloudflare Workers';
