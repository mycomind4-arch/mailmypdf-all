-- ============================================================================
-- MailMyPDF Entitlements System - Phase 1: Core Schema
-- ============================================================================
--
-- This migration establishes the foundation for flexible pricing, entitlements,
-- and usage tracking across the MailMyPDF ecosystem.
--
-- Key principles:
-- 1. Organizations can have multiple members with different roles
-- 2. Entitlements are policies assigned to users or organizations
-- 3. Pricing profiles are immutable (versioned, never modified)
-- 4. Quotes are immutable audit trails
-- 5. All data is RLS-protected

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
-- Teams/companies that can have multiple users

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  billing_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_plan ON public.organizations(plan);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.organizations IS 'Teams/companies with multiple members. Each org can have its own pricing policies.';

-- ============================================================================
-- ORGANIZATION_MEMBERS TABLE
-- ============================================================================
-- Maps users to organizations with roles (owner, admin, member, viewer)

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_role ON public.organization_members(role);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.organization_members IS 'User membership in organizations with role-based access (owner, admin, member, viewer).';

-- ============================================================================
-- ENTITLEMENT_POLICIES TABLE
-- ============================================================================
-- Reusable policy definitions (e.g., "Founder Account", "Partner Attorney")

CREATE TABLE IF NOT EXISTS public.entitlement_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,

  -- Pricing adjustments (applied to base workflow pricing)
  workflow_discount_percent numeric DEFAULT 0 CHECK (workflow_discount_percent >= 0 AND workflow_discount_percent <= 100),
  workflow_discount_cents numeric DEFAULT 0 CHECK (workflow_discount_cents >= 0),

  -- Mail and service fees
  mailing_markup_cents numeric DEFAULT 0 CHECK (mailing_markup_cents >= 0),
  service_fee_cents numeric DEFAULT 0 CHECK (service_fee_cents >= 0),

  -- Usage quotas
  monthly_free_workflows integer DEFAULT 0,
  monthly_free_credits numeric DEFAULT 0,

  -- Feature flags
  features jsonb DEFAULT '{"includes_private_office": false, "includes_premium_workflows": false}'::jsonb,

  commercial_status text NOT NULL DEFAULT 'active' CHECK (commercial_status IN ('active', 'beta', 'deprecated', 'archived')),

  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_slug ON public.entitlement_policies(policy_slug);
CREATE INDEX idx_policies_status ON public.entitlement_policies(commercial_status);

ALTER TABLE public.entitlement_policies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.entitlement_policies IS 'Reusable entitlement policy templates (e.g., "Founder", "Partner Attorney"). Define pricing adjustments and feature access.';

-- ============================================================================
-- ENTITLEMENT_ASSIGNMENTS TABLE
-- ============================================================================
-- Maps users/orgs to policies with optional expiration

CREATE TABLE IF NOT EXISTS public.entitlement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.entitlement_policies(id) ON DELETE RESTRICT,

  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,

  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,

  CHECK ((user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL) OR (user_id IS NOT NULL AND organization_id IS NOT NULL)),
  CONSTRAINT valid_assignment CHECK (
    (user_id IS NOT NULL) OR (organization_id IS NOT NULL)
  )
);

CREATE INDEX idx_assignments_user_id ON public.entitlement_assignments(user_id);
CREATE INDEX idx_assignments_org_id ON public.entitlement_assignments(organization_id);
CREATE INDEX idx_assignments_policy_id ON public.entitlement_assignments(policy_id);
CREATE INDEX idx_assignments_expires_at ON public.entitlement_assignments(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.entitlement_assignments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.entitlement_assignments IS 'Active entitlements for users or organizations. User-level assignments take precedence over org-level. Assignments can expire.';

-- ============================================================================
-- PRICING_PROFILES TABLE
-- ============================================================================
-- Immutable snapshots of pricing (never update, create new versions)

CREATE TABLE IF NOT EXISTS public.pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.entitlement_policies(id) ON DELETE RESTRICT,

  -- Workflow pricing
  workflow_base_cents numeric NOT NULL CHECK (workflow_base_cents >= 0),

  -- Mail pricing adjustments
  mailing_markup_cents numeric NOT NULL DEFAULT 50 CHECK (mailing_markup_cents >= 0),
  mailing_subsidy_cents numeric NOT NULL DEFAULT 0 CHECK (mailing_subsidy_cents >= 0),

  -- Service fees
  service_fee_cents numeric NOT NULL DEFAULT 99 CHECK (service_fee_cents >= 0),

  -- Versioning (profiles are immutable)
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  superseded_by uuid REFERENCES public.pricing_profiles(id) ON DELETE SET NULL,

  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  commercial_status text NOT NULL DEFAULT 'production' CHECK (commercial_status IN ('test', 'beta', 'production', 'archived')),

  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,

  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(policy_id, version)
);

CREATE INDEX idx_profiles_policy_id ON public.pricing_profiles(policy_id);
CREATE INDEX idx_profiles_active ON public.pricing_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_status ON public.pricing_profiles(commercial_status);

ALTER TABLE public.pricing_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.pricing_profiles IS 'Immutable pricing snapshots. Profiles are versioned; never modify an existing profile. Create a new version instead.';

-- ============================================================================
-- PRICING_QUOTES TABLE
-- ============================================================================
-- Immutable quotes with complete lineage for audit trails

CREATE TABLE IF NOT EXISTS public.pricing_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workflow context
  workflow_id text NOT NULL,
  vertical_id text NOT NULL,

  -- Pricing breakdown (all in cents)
  workflow_base_cents numeric NOT NULL CHECK (workflow_base_cents >= 0),
  workflow_discount_cents numeric NOT NULL DEFAULT 0 CHECK (workflow_discount_cents >= 0),
  mailing_service_cost_cents numeric NOT NULL DEFAULT 0 CHECK (mailing_service_cost_cents >= 0),
  extra_page_cost_cents numeric NOT NULL DEFAULT 0 CHECK (extra_page_cost_cents >= 0),
  discount_code_value_cents numeric NOT NULL DEFAULT 0 CHECK (discount_code_value_cents >= 0),
  total_cents numeric NOT NULL CHECK (total_cents >= 0),

  -- Complete lineage for audit
  assignment_id uuid REFERENCES public.entitlement_assignments(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES public.entitlement_policies(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.pricing_profiles(id) ON DELETE SET NULL,

  -- Quote state
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'reversed')),
  discount_code text,
  mailing_class text DEFAULT 'standard',

  -- Expiration (quotes are temporary)
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '1 hour'),

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX idx_quotes_user_id ON public.pricing_quotes (user_id);
CREATE INDEX idx_quotes_workflow_id ON public.pricing_quotes (workflow_id);
CREATE INDEX idx_quotes_status ON public.pricing_quotes (status);
CREATE INDEX idx_quotes_expires_at ON public.pricing_quotes (expires_at);
CREATE INDEX idx_quotes_created_at ON public.pricing_quotes (created_at DESC);

ALTER TABLE public.pricing_quotes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.pricing_quotes IS 'Immutable pricing quotes. Complete audit trail with full lineage (assignment → policy → profile). Quotes expire after 1 hour.';

-- ============================================================================
-- ENTITLEMENTS_AUDIT_LOG TABLE
-- ============================================================================
-- Immutable change log for compliance and debugging

CREATE TABLE IF NOT EXISTS public.entitlements_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  action text NOT NULL CHECK (action IN (
    'policy_created',
    'policy_updated',
    'assignment_created',
    'assignment_updated',
    'assignment_expired',
    'quote_created',
    'quote_accepted',
    'quote_expired',
    'quote_reversed',
    'org_created',
    'member_added',
    'member_removed'
  )),

  resource_type text NOT NULL CHECK (resource_type IN (
    'policy',
    'assignment',
    'quote',
    'organization',
    'member'
  )),

  resource_id text,

  changes jsonb DEFAULT '{}'::jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_action ON public.entitlements_audit_log (action);
CREATE INDEX idx_audit_resource ON public.entitlements_audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON public.entitlements_audit_log (created_at DESC);
CREATE INDEX idx_audit_actor ON public.entitlements_audit_log (actor_user_id);

ALTER TABLE public.entitlements_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.entitlements_audit_log IS 'Immutable change log. Answer "who changed what and when?" for compliance audits.';

-- ============================================================================
-- HELPER FUNCTION: get_user_entitlements
-- ============================================================================
-- Resolves active entitlements for a user (user-level > org-level > default)

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid)
RETURNS TABLE (
  assignment_id uuid,
  policy_id uuid,
  policy_slug text,
  is_user_level boolean,
  expires_at timestamptz
) LANGUAGE sql STABLE AS $$
  -- First, check for user-level assignments
  SELECT
    ea.id,
    ep.id,
    ep.policy_slug,
    true,
    ea.expires_at
  FROM public.entitlement_assignments ea
  JOIN public.entitlement_policies ep ON ea.policy_id = ep.id
  WHERE ea.user_id = p_user_id
    AND (ea.expires_at IS NULL OR ea.expires_at > now())
    AND ep.commercial_status = 'active'

  UNION ALL

  -- Then check for org-level assignments (only if no user-level found)
  SELECT
    ea.id,
    ep.id,
    ep.policy_slug,
    false,
    ea.expires_at
  FROM public.entitlement_assignments ea
  JOIN public.entitlement_policies ep ON ea.policy_id = ep.id
  JOIN public.organization_members om ON ea.organization_id = om.organization_id
  WHERE om.user_id = p_user_id
    AND (ea.expires_at IS NULL OR ea.expires_at > now())
    AND ep.commercial_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.entitlement_assignments user_ea
      JOIN public.entitlement_policies user_ep ON user_ea.policy_id = user_ep.id
      WHERE user_ea.user_id = p_user_id
        AND (user_ea.expires_at IS NULL OR user_ea.expires_at > now())
        AND user_ep.commercial_status = 'active'
    )
  ORDER BY expires_at NULLS FIRST
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_entitlements IS 'Get active entitlements for a user. User-level takes precedence over org-level. Returns earliest expiring assignment if multiple exist.';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Organizations: Users can see orgs they're members of
CREATE POLICY org_select_policy ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY org_insert_policy ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY org_update_policy ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization Members: Users can see members of orgs they're in
CREATE POLICY members_select_policy ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Entitlement Policies: Everyone can read active policies
CREATE POLICY policies_select_policy ON public.entitlement_policies
  FOR SELECT
  TO authenticated
  USING (commercial_status = 'active');

-- Entitlement Assignments: Users can only see their own assignments
CREATE POLICY assignments_select_policy ON public.entitlement_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Pricing Profiles: Everyone can read active production profiles
CREATE POLICY profiles_select_policy ON public.pricing_profiles
  FOR SELECT
  TO authenticated
  USING (commercial_status = 'production' AND is_active = true);

-- Pricing Quotes: Users can only see their own quotes
CREATE POLICY quotes_select_policy ON public.pricing_quotes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY quotes_insert_policy ON public.pricing_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Audit Log: Users can see logs for their own actions and entitlements
CREATE POLICY audit_select_policy ON public.entitlements_audit_log
  FOR SELECT
  TO authenticated
  USING (
    actor_user_id = auth.uid()
    OR resource_id IN (
      SELECT id::text FROM public.entitlement_assignments WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY org_select_policy ON public.organizations IS 'Users see orgs they created or are members of';
COMMENT ON POLICY quotes_select_policy ON public.pricing_quotes IS 'Users see only their own quotes';
COMMENT ON POLICY policies_select_policy ON public.entitlement_policies IS 'Everyone sees active policy definitions';
