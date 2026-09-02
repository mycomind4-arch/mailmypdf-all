-- MailMyPDF Default Entitlements Seed Data
-- Pricing profiles, policies, and example assignments

/* ───────────────────────────────────────────────────────────────────────────── */
/* PRICING PROFILES: Standard tiers                                             */
/* ───────────────────────────────────────────────────────────────────────────── */

INSERT INTO public.pricing_profiles (name, version, base_workflow_price_cents, workflow_discount_percent, mailing_markup_cents, service_fee_cents, metadata)
VALUES
  (
    'Standard Pricing',
    1,
    1900,      -- $19.00 base workflow price
    0,         -- No discount
    50,        -- $0.50 mailing markup
    99,        -- $0.99 service fee
    '{"description": "Default public pricing"}'::jsonb
  ),
  (
    'Founder Account',
    1,
    0,         -- $0 workflow price (free)
    NULL,
    50,        -- $0.50 mailing markup
    0,         -- No service fee
    '{"description": "Complimentary founder pricing", "duration": "lifetime"}'::jsonb
  ),
  (
    'Partner Attorney',
    1,
    950,       -- 50% off ($9.50)
    50,        -- Or use discount percent
    50,        -- Standard mailing markup
    0,         -- No service fee
    '{"description": "Law firm partner discount", "duration": "annual"}'::jsonb
  ),
  (
    'Internal Admin',
    1,
    0,         -- Free
    NULL,
    0,         -- Mailing at cost (no markup)
    0,         -- No service fee
    '{"description": "Internal MailMyPDF team", "mailing_at_cost": true}'::jsonb
  );


/* ───────────────────────────────────────────────────────────────────────────── */
/* ENTITLEMENT POLICIES: Reusable policies                                      */
/* ───────────────────────────────────────────────────────────────────────────── */

INSERT INTO public.entitlement_policies (slug, name, description, pricing_profile_id, scope, private_office_included, premium_workflows_included, ai_processing_free, research_included, metadata)
VALUES
  (
    'default-public',
    'Default Public Pricing',
    'Standard MailMyPDF public pricing. No special access.',
    (SELECT id FROM public.pricing_profiles WHERE name = 'Standard Pricing' LIMIT 1),
    'user',
    false,
    false,
    false,
    false,
    '{}'::jsonb
  ),
  (
    'founders-account',
    'Founder Account',
    'Complimentary founder pricing. Everything included.',
    (SELECT id FROM public.pricing_profiles WHERE name = 'Founder Account' LIMIT 1),
    'user',
    true,
    true,
    true,
    true,
    '{"tier": "premium", "duration": "lifetime"}'::jsonb
  ),
  (
    'partner-attorney',
    'Partner Attorney',
    '50% workflow discount. No service fees. Includes private office.',
    (SELECT id FROM public.pricing_profiles WHERE name = 'Partner Attorney' LIMIT 1),
    'user',
    true,
    true,
    false,
    true,
    '{"tier": "professional", "discount_percent": 50}'::jsonb
  ),
  (
    'internal-admin',
    'Internal MailMyPDF',
    'Internal team. Everything free. Mailing at provider cost.',
    (SELECT id FROM public.pricing_profiles WHERE name = 'Internal Admin' LIMIT 1),
    'user',
    true,
    true,
    true,
    true,
    '{"tier": "internal", "scope": "team"}'::jsonb
  ),
  (
    'legal-aid-org',
    'Legal Aid Organization',
    'Nonprofit legal aid. 100 free workflows/month. Mailing at cost.',
    (SELECT id FROM public.pricing_profiles WHERE name = 'Internal Admin' LIMIT 1),
    'organization',
    false,
    true,
    false,
    true,
    '{"tier": "nonprofit", "monthly_workflows": 100, "mailing_at_cost": true}'::jsonb
  );


/* ───────────────────────────────────────────────────────────────────────────── */
/* EXAMPLE ASSIGNMENTS: Show how entitlements work                              */
/* Note: These are examples. In production, assignments are created via UI/API. */
/* ───────────────────────────────────────────────────────────────────────────── */

-- Example: A founder gets lifetime free access
-- INSERT INTO public.entitlement_assignments (user_id, entitlement_policy_id, assigned_by)
-- SELECT
--   u.id,
--   (SELECT id FROM public.entitlement_policies WHERE slug = 'founders-account'),
--   u.id
-- FROM auth.users u
-- WHERE u.email = 'founder@mailmypdf.com'
-- ON CONFLICT DO NOTHING;

-- Example: A legal aid organization gets nonprofit pricing
-- INSERT INTO public.entitlement_assignments (organization_id, entitlement_policy_id, assigned_by)
-- SELECT
--   o.id,
--   (SELECT id FROM public.entitlement_policies WHERE slug = 'legal-aid-org'),
--   o.created_by
-- FROM public.organizations o
-- WHERE o.slug = 'humboldt-county-legal-aid'
-- ON CONFLICT DO NOTHING;
