-- MailMyPDF Core Entitlements System
-- Implements: organizations, entitlement policies, pricing profiles, audit-safe quotes
-- Date: 2025-09-02

/* ───────────────────────────────────────────────────────────────────────────── */
/* ORGANIZATIONS: Team/company accounts                                         */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  website text,
  logo_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS 'Teams, companies, law firms, agencies. One organization can have multiple users.';

CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations (slug);
CREATE INDEX IF NOT EXISTS organizations_created_by_idx ON public.organizations (created_by);


/* ───────────────────────────────────────────────────────────────────────────── */
/* ORGANIZATION MEMBERS: Users within organizations                             */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TYPE public.org_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS 'Membership in organizations. Separate from entitlements (roles != pricing).';

CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS org_members_org_id_idx ON public.organization_members (organization_id);


/* ───────────────────────────────────────────────────────────────────────────── */
/* PRICING PROFILES: Immutable snapshots of pricing at order time               */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,

  -- Workflow pricing
  base_workflow_price_cents integer NOT NULL DEFAULT 0,
  workflow_discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  workflow_discount_cents integer,

  -- Mailing pricing
  mailing_markup_cents integer NOT NULL DEFAULT 50,
  mailing_subsidy_cents integer NOT NULL DEFAULT 0,
  mailing_at_cost boolean NOT NULL DEFAULT false,

  -- Service fees
  service_fee_cents integer NOT NULL DEFAULT 99,
  service_fee_waived boolean NOT NULL DEFAULT false,

  -- Platform
  platform_fee_waived boolean NOT NULL DEFAULT false,

  -- Credits & limits
  monthly_free_workflows integer,
  workflow_credit_balance integer,
  mailing_credit_cents integer,

  -- Metadata
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workflow_pricing_valid CHECK (
    (workflow_discount_percent >= 0 AND workflow_discount_percent <= 100)
    OR (workflow_discount_cents IS NOT NULL AND workflow_discount_cents >= 0)
  )
);

COMMENT ON TABLE public.pricing_profiles IS 'Immutable pricing snapshots. Stored with every order for auditability. Never update—create new versions.';

CREATE INDEX IF NOT EXISTS pricing_profiles_name_version_idx ON public.pricing_profiles (name, version DESC);


/* ───────────────────────────────────────────────────────────────────────────── */
/* ENTITLEMENT POLICIES: Reusable pricing + access policies                     */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TYPE public.entitlement_scope AS ENUM ('user', 'organization', 'global');
CREATE TYPE public.entitlement_status AS ENUM ('active', 'paused', 'expired');

CREATE TABLE IF NOT EXISTS public.entitlement_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,

  -- Pricing profile
  pricing_profile_id uuid NOT NULL REFERENCES public.pricing_profiles(id) ON DELETE RESTRICT,

  -- Scope
  scope public.entitlement_scope NOT NULL DEFAULT 'user',

  -- Feature flags
  private_office_included boolean NOT NULL DEFAULT false,
  premium_workflows_included boolean NOT NULL DEFAULT false,
  ai_processing_free boolean NOT NULL DEFAULT false,
  research_included boolean NOT NULL DEFAULT false,

  -- Metadata
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.entitlement_policies IS 'Reusable policy definitions: "Founder Account", "Partner Attorney", "Internal Admin", etc.';

CREATE INDEX IF NOT EXISTS entitlement_policies_slug_idx ON public.entitlement_policies (slug);


/* ───────────────────────────────────────────────────────────────────────────── */
/* ENTITLEMENT ASSIGNMENTS: Map users/orgs to policies                          */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.entitlement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,

  entitlement_policy_id uuid NOT NULL REFERENCES public.entitlement_policies(id) ON DELETE RESTRICT,

  status public.entitlement_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,

  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Either user_id or organization_id must be set, not both
  CONSTRAINT must_be_user_or_org CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL)
    OR (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.entitlement_assignments IS 'Active entitlement for a user or organization. Multiple assignments allowed (first matching active wins).';

CREATE INDEX IF NOT EXISTS entitlement_assignments_user_idx ON public.entitlement_assignments (user_id, status, expires_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS entitlement_assignments_org_idx ON public.entitlement_assignments (organization_id, status, expires_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS entitlement_assignments_expires_idx ON public.entitlement_assignments (expires_at) WHERE status = 'active';


/* ───────────────────────────────────────────────────────────────────────────── */
/* PRICING QUOTES: Immutable, auditable order quotes                            */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.pricing_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,

  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- What was requested
  workflow_id text,
  workflow_name text,
  mailing_method text,

  -- Base pricing
  base_workflow_price_cents integer NOT NULL,
  base_mailing_price_cents integer NOT NULL,

  -- Discounts/subsidies applied
  workflow_discount_cents integer NOT NULL DEFAULT 0,
  mailing_subsidy_cents integer NOT NULL DEFAULT 0,
  service_fee_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,

  -- Credits used
  workflow_credits_used integer NOT NULL DEFAULT 0,
  mailing_credits_used_cents integer NOT NULL DEFAULT 0,

  -- Final amounts
  workflow_price_cents integer NOT NULL,
  mailing_price_cents integer NOT NULL,
  total_cents integer NOT NULL,

  -- Why this price?
  pricing_profile_id uuid NOT NULL REFERENCES public.pricing_profiles(id) ON DELETE RESTRICT,
  entitlement_policy_id uuid NOT NULL REFERENCES public.entitlement_policies(id) ON DELETE RESTRICT,
  entitlement_assignment_id uuid NOT NULL REFERENCES public.entitlement_assignments(id) ON DELETE RESTRICT,

  -- Engine versioning
  quote_version integer NOT NULL DEFAULT 1,
  pricing_engine_version text NOT NULL DEFAULT '1.0',

  -- Human readability
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- When was this quote valid?
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  accepted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pricing_quotes IS 'Immutable pricing decisions. Every order must reference a quote. Never change quotes after creation.';

CREATE INDEX IF NOT EXISTS pricing_quotes_user_idx ON public.pricing_quotes (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS pricing_quotes_order_idx ON public.pricing_quotes (order_id);
CREATE INDEX IF NOT EXISTS pricing_quotes_entitlement_idx ON public.pricing_quotes (entitlement_assignment_id);


/* ───────────────────────────────────────────────────────────────────────────── */
/* AUDIT LOG: Track all entitlement changes                                     */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.entitlements_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('assign', 'revoke', 'expire', 'pause', 'resume', 'create_policy', 'create_profile')),

  resource_type text NOT NULL CHECK (resource_type IN ('assignment', 'policy', 'profile')),
  resource_id uuid NOT NULL,

  -- Before/after state
  old_values jsonb,
  new_values jsonb,

  -- Context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.entitlements_audit_log IS 'Immutable audit trail. Answer "why did this user get this price?" 6 months later.';

CREATE INDEX IF NOT EXISTS entitlements_audit_user_idx ON public.entitlements_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entitlements_audit_resource_idx ON public.entitlements_audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS entitlements_audit_created_idx ON public.entitlements_audit_log (created_at DESC);


/* ───────────────────────────────────────────────────────────────────────────── */
/* ROW-LEVEL SECURITY: Enforce org/user boundaries                              */
/* ───────────────────────────────────────────────────────────────────────────── */

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_self_select" ON public.organizations;
CREATE POLICY "organizations_self_select" ON public.organizations
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF exists "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

ALTER TABLE public.entitlement_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entitlements_view_own" ON public.entitlement_assignments;
CREATE POLICY "entitlements_view_own" ON public.entitlement_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = entitlement_assignments.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.pricing_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_view_own" ON public.pricing_quotes;
CREATE POLICY "quotes_view_own" ON public.pricing_quotes
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = pricing_quotes.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

ALTER TABLE public.entitlements_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_view_admin" ON public.entitlements_audit_log;
CREATE POLICY "audit_view_admin" ON public.entitlements_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.created_by = auth.uid()
      AND (
        organizations.id = entitlements_audit_log.organization_id
        OR entitlements_audit_log.organization_id IS NULL
      )
    )
  );


/* ───────────────────────────────────────────────────────────────────────────── */
/* HELPER FUNCTION: Get active entitlements for a user                          */
/* ───────────────────────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  policy_id uuid,
  policy_slug text,
  pricing_profile_id uuid,
  scope public.entitlement_scope,
  expires_at timestamptz
) AS $$
BEGIN
  -- User-level entitlements first (highest priority)
  RETURN QUERY
  SELECT
    ea.id,
    ea.entitlement_policy_id,
    ep.slug,
    ep.pricing_profile_id,
    ep.scope,
    ea.expires_at
  FROM public.entitlement_assignments ea
  JOIN public.entitlement_policies ep ON ep.id = ea.entitlement_policy_id
  WHERE ea.user_id = p_user_id
  AND ea.status = 'active'
  AND (ea.expires_at IS NULL OR ea.expires_at > now())
  ORDER BY ea.assigned_at DESC
  LIMIT 1;

  -- If no user entitlements, check organization entitlements
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      ea.id,
      ea.entitlement_policy_id,
      ep.slug,
      ep.pricing_profile_id,
      ep.scope,
      ea.expires_at
    FROM public.entitlement_assignments ea
    JOIN public.entitlement_policies ep ON ep.id = ea.entitlement_policy_id
    JOIN public.organization_members om ON om.organization_id = ea.organization_id
    WHERE om.user_id = p_user_id
    AND ea.status = 'active'
    AND (ea.expires_at IS NULL OR ea.expires_at > now())
    ORDER BY ea.assigned_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_user_entitlements IS 'Resolve active entitlements for a user (user-level takes precedence over org-level).';


/* ───────────────────────────────────────────────────────────────────────────── */
/* GRANTS: Service role can manage; authenticated can read own                  */
/* ───────────────────────────────────────────────────────────────────────────── */

GRANT ALL ON public.organizations TO service_role;
GRANT ALL ON public.organization_members TO service_role;
GRANT ALL ON public.pricing_profiles TO service_role;
GRANT ALL ON public.entitlement_policies TO service_role;
GRANT ALL ON public.entitlement_assignments TO service_role;
GRANT ALL ON public.pricing_quotes TO service_role;
GRANT ALL ON public.entitlements_audit_log TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_entitlements TO authenticated;
