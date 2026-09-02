-- Workflow Hub: User Favorites & Persistence
-- Tracks user-scoped favorite workflows for discovery and quick access
-- Date: 2026-09-02

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW FAVORITES: Durable favorites persistence                           */
/* ─────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.workflow_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (private per user)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workflow reference
  workflow_id text NOT NULL,

  -- State
  is_active boolean NOT NULL DEFAULT true,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: one favorite per workflow per user
  UNIQUE (user_id, workflow_id)
);

COMMENT ON TABLE public.workflow_favorites IS 'User-scoped workflow favorites. Private to each user. Soft-deleted via is_active flag.';

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS workflow_favorites_user_id_idx ON public.workflow_favorites (user_id);
CREATE INDEX IF NOT EXISTS workflow_favorites_user_active_idx ON public.workflow_favorites (user_id, is_active);
CREATE INDEX IF NOT EXISTS workflow_favorites_workflow_id_idx ON public.workflow_favorites (workflow_id);

-- Row-level security: Users see only their own favorites
ALTER TABLE public.workflow_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.workflow_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites"
  ON public.workflow_favorites
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW HUB AUDIT: Track discovery and usage patterns                     */
/* ─────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.workflow_hub_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type
  event_type text NOT NULL, -- viewed, started, completed, favorited, searched

  -- Workflow reference
  workflow_id text NOT NULL,

  -- Search context (if applicable)
  search_query text,

  -- Source
  source text, -- hub, category, search, recommendations

  -- Metadata
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workflow_hub_events IS 'Analytics: Track workflow discovery and engagement patterns for recommendations and popularity scoring.';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS workflow_hub_events_user_id_idx ON public.workflow_hub_events (user_id);
CREATE INDEX IF NOT EXISTS workflow_hub_events_workflow_id_idx ON public.workflow_hub_events (workflow_id);
CREATE INDEX IF NOT EXISTS workflow_hub_events_event_type_idx ON public.workflow_hub_events (event_type);
CREATE INDEX IF NOT EXISTS workflow_hub_events_created_at_idx ON public.workflow_hub_events (created_at DESC);

-- RLS: Users can only view their own events
ALTER TABLE public.workflow_hub_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON public.workflow_hub_events
  FOR SELECT
  USING (auth.uid() = user_id);

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW RECOMMENDATIONS: User-scoped recommendations                       */
/* ─────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.workflow_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recommendation
  workflow_id text NOT NULL,
  reason text NOT NULL, -- next-step, related, trending, similar-to-completed

  -- Ranking
  relevance_score numeric(3,2) NOT NULL DEFAULT 0.5,

  -- State
  dismissed boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,

  -- Unique: one recommendation per workflow per user
  UNIQUE (user_id, workflow_id)
);

COMMENT ON TABLE public.workflow_recommendations IS 'Computed recommendations for users based on their activity. Includes workflow chaining suggestions.';

-- Indexes
CREATE INDEX IF NOT EXISTS workflow_recommendations_user_idx ON public.workflow_recommendations (user_id);
CREATE INDEX IF NOT EXISTS workflow_recommendations_user_dismissed_idx ON public.workflow_recommendations (user_id, dismissed);
CREATE INDEX IF NOT EXISTS workflow_recommendations_relevance_idx ON public.workflow_recommendations (user_id, relevance_score DESC);

-- RLS: Users see only their recommendations
ALTER TABLE public.workflow_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their recommendations"
  ON public.workflow_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

/* ─────────────────────────────────────────────────────────────────────────── */
/* GRANTS: Ensure service role can write analytics                             */
/* ─────────────────────────────────────────────────────────────────────────── */

GRANT ALL PRIVILEGES ON public.workflow_favorites TO service_role;
GRANT ALL PRIVILEGES ON public.workflow_hub_events TO service_role;
GRANT ALL PRIVILEGES ON public.workflow_recommendations TO service_role;
