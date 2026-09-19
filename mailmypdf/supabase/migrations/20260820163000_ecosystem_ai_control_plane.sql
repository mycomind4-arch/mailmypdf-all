CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('anthropic','openai','gemini')),
  label text NOT NULL,
  encrypted_api_key text NOT NULL,
  api_base_url text,
  default_model text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_workflow_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug text NOT NULL,
  workflow_slug text,
  task text NOT NULL CHECK (task IN ('analysis','extraction','draft','validation','revision')),
  provider_id uuid NOT NULL REFERENCES public.ai_provider_configs(id) ON DELETE CASCADE,
  model_override text,
  prompt_override text,
  fallback_provider_id uuid REFERENCES public.ai_provider_configs(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_slug, workflow_slug, task)
);

CREATE TABLE IF NOT EXISTS public.ecosystem_runtime_variables (
  key text PRIMARY KEY,
  plaintext_value text,
  encrypted_value text,
  is_secret boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_secret AND encrypted_value IS NOT NULL AND plaintext_value IS NULL) OR (NOT is_secret AND plaintext_value IS NOT NULL AND encrypted_value IS NULL))
);

CREATE TABLE IF NOT EXISTS public.ecosystem_config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflow_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_runtime_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_config_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_workflow_routes_lookup_idx ON public.ai_workflow_routes(vertical_slug, workflow_slug, task, enabled);
CREATE INDEX IF NOT EXISTS ecosystem_config_audit_created_idx ON public.ecosystem_config_audit(created_at DESC);

COMMENT ON TABLE public.ai_provider_configs IS 'Encrypted server-side AI provider credentials and defaults. Never expose encrypted_api_key to clients.';
COMMENT ON TABLE public.ai_workflow_routes IS 'Per-vertical/per-workflow AI routing and prompt overrides.';
COMMENT ON TABLE public.ecosystem_runtime_variables IS 'Central ecosystem runtime variables; secrets are encrypted at rest.';
COMMENT ON TABLE public.ecosystem_config_audit IS 'Immutable audit trail for central admin configuration changes.';
