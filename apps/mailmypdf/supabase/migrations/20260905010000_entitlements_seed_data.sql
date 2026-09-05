-- ============================================================================
-- MailMyPDF Entitlements System - Phase 1: Seed Data
-- ============================================================================
--
-- Default pricing profiles and policies for the ecosystem.
-- These serve as templates for user and organization entitlements.

-- ============================================================================
-- SEED: DEFAULT ENTITLEMENT POLICIES
-- ============================================================================

INSERT INTO public.entitlement_policies (
  policy_slug,
  display_name,
  description,
  workflow_discount_percent,
  workflow_discount_cents,
  mailing_markup_cents,
  service_fee_cents,
  monthly_free_workflows,
  monthly_free_credits,
  features,
  commercial_status
) VALUES
  -- Standard Pricing (default for all users)
  (
    'default-public',
    'Standard Pricing',
    'Default pricing for new users. Full pay-per-use.',
    0,
    0,
    50,
    99,
    0,
    0,
    '{"includes_private_office": false, "includes_premium_workflows": false}'::jsonb,
    'active'
  ),
  -- Founder Account (lifetime free access)
  (
    'founders-account',
    'Founder Account',
    'Lifetime free access for MailMyPDF founders and core team.',
    100,
    0,
    0,
    0,
    0,
    0,
    '{"includes_private_office": true, "includes_premium_workflows": true}'::jsonb,
    'active'
  ),
  -- Partner Attorney (50% off)
  (
    'partner-attorney',
    'Partner Attorney',
    '50% discount on all workflows, private office included.',
    50,
    0,
    50,
    0,
    0,
    0,
    '{"includes_private_office": true, "includes_premium_workflows": false}'::jsonb,
    'active'
  ),
  -- Internal Admin (free for testing)
  (
    'internal-admin',
    'Internal Admin',
    'Free access for internal team and testing. Mailing at cost.',
    100,
    0,
    0,
    0,
    0,
    0,
    '{"includes_private_office": true, "includes_premium_workflows": true}'::jsonb,
    'active'
  ),
  -- Legal Aid Organization (nonprofit pricing)
  (
    'legal-aid-org',
    'Legal Aid Organization',
    'Nonprofit organization pricing: 100 free workflows/month, mailing at cost.',
    100,
    0,
    0,
    0,
    100,
    0,
    '{"includes_private_office": false, "includes_premium_workflows": false}'::jsonb,
    'active'
  ),
  -- Beta Early Adopter (30% discount, limited time)
  (
    'beta-early-adopter',
    'Beta Early Adopter',
    '30% discount for users who joined during beta period. Limited time.',
    30,
    0,
    50,
    99,
    0,
    0,
    '{"includes_private_office": false, "includes_premium_workflows": false}'::jsonb,
    'beta'
  );

-- ============================================================================
-- SEED: PRICING PROFILES
-- ============================================================================
-- Immutable pricing snapshots for each policy (version 1, created today)

-- Standard Pricing Profile ($19 base + $0.50 mailing + $0.99 service)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  1999,
  50,
  0,
  99,
  1,
  true,
  'usd',
  'production',
  now(),
  NULL,
  '{"description": "Standard pay-per-use pricing"}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'default-public';

-- Founder Account Profile (free)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  0,
  0,
  0,
  0,
  1,
  true,
  'usd',
  'production',
  now(),
  NULL,
  '{"description": "Founders get everything free"}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'founders-account';

-- Partner Attorney Profile ($9.95 base + $0.50 mailing, no service fee)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  995,
  50,
  0,
  0,
  1,
  true,
  'usd',
  'production',
  now(),
  NULL,
  '{"description": "50% off for partner attorneys"}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'partner-attorney';

-- Internal Admin Profile (free)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  0,
  0,
  0,
  0,
  1,
  true,
  'usd',
  'production',
  now(),
  NULL,
  '{"description": "Internal team free access"}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'internal-admin';

-- Legal Aid Organization Profile (free workflows, mailing at cost)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  0,
  0,
  0,
  0,
  1,
  true,
  'usd',
  'production',
  now(),
  NULL,
  '{"description": "Nonprofit: free workflows + mailing at cost", "monthly_quota": 100}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'legal-aid-org';

-- Beta Early Adopter Profile ($13.99 base + $0.50 mailing + $0.99 service)
INSERT INTO public.pricing_profiles (
  policy_id,
  workflow_base_cents,
  mailing_markup_cents,
  mailing_subsidy_cents,
  service_fee_cents,
  version,
  is_active,
  currency,
  commercial_status,
  effective_from,
  effective_until,
  metadata
)
SELECT
  ep.id,
  1399,
  50,
  0,
  99,
  1,
  true,
  'usd',
  'beta',
  now(),
  now() + INTERVAL '90 days',
  '{"description": "Beta early adopter discount (30% off)"}'::jsonb
FROM public.entitlement_policies ep
WHERE ep.policy_slug = 'beta-early-adopter';

-- ============================================================================
-- LOG SEED DATA CREATION
-- ============================================================================

INSERT INTO public.entitlements_audit_log (
  actor_user_id,
  action,
  resource_type,
  resource_id,
  changes,
  reason,
  metadata
) VALUES
  (NULL, 'policy_created', 'policy', 'default-public', '{"count": 6}'::jsonb, 'System initialization', '{"phase": 1}'::jsonb),
  (NULL, 'policy_created', 'policy', 'founders-account', '{"profiles": 6}'::jsonb, 'System initialization', '{"phase": 1}'::jsonb);

COMMENT ON TABLE public.entitlement_policies IS 'Seed data loaded: 6 default policies and 6 pricing profiles';
