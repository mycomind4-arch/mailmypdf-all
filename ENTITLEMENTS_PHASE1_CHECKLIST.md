# MailMyPDF Entitlements Phase 1 - Testing & Deployment Checklist

## Pre-Deployment

### 1. Environment Setup
- [ ] Verify `SUPABASE_URL` environment variable is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable is set
- [ ] Verify `SUPABASE_ANON_KEY` environment variable is set
- [ ] Verify local Supabase is running (or using live project)

### 2. Database Backup
- [ ] Back up existing Supabase project (if not dev)
- [ ] Confirm no critical data in test Supabase instance

### 3. Verify No Conflicts
- [ ] Check for existing `organizations` table (should not exist)
- [ ] Check for existing `entitlement_policies` table (should not exist)
- [ ] Check for existing `pricing_quotes` table (should not exist)

## Deployment Steps

### Step 1: Apply Main Schema Migration
```bash
# From mailmypdf-all directory:
supabase migration up
# Or manually run the migration in Supabase dashboard:
# 20260902000000_core_entitlements_system.sql
```

**Expected:**
- 7 new tables created
- RLS enabled on all tables
- Indexes created
- Helper function `get_user_entitlements()` created
- No errors

### Step 2: Apply Seed Data Migration
```bash
supabase migration up
# Or manually run:
# 20260902010000_entitlements_seed_data.sql
```

**Expected:**
- 4 pricing profiles inserted
- 5 entitlement policies inserted
- No errors

### Step 3: Verify Schema
```sql
-- Run in Supabase SQL Editor

-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%entitlement%' OR tablename LIKE '%pricing%' OR tablename = 'organizations' OR tablename = 'organization_members';

-- Should show:
-- organizations
-- organization_members
-- pricing_profiles
-- entitlement_policies
-- entitlement_assignments
-- pricing_quotes
-- entitlements_audit_log

-- Check seed data
SELECT COUNT(*) FROM public.pricing_profiles;  -- Should be 4
SELECT COUNT(*) FROM public.entitlement_policies;  -- Should be 5
SELECT slug FROM public.entitlement_policies ORDER BY slug;  -- Should show all 5 policies
```

### Step 4: Test Core Function
```sql
-- Test get_user_entitlements function
SELECT * FROM public.get_user_entitlements('00000000-0000-0000-0000-000000000000'::uuid);
-- Should return empty result (no entitlements for fake UUID)
```

## Unit Tests

### Step 5: Run Tests
```bash
# From mailmypdf-all/apps/mailmypdf directory:
npm run test -- tests/entitlements-phase1.test.ts

# Or with Vitest:
npx vitest tests/entitlements-phase1.test.ts
```

**Expected Test Results:**
- ✅ Database schema tests (7 tables exist)
- ✅ Seed data tests (4 profiles, 5 policies with correct values)
- ✅ Pricing calculation tests (math validates)
- ✅ RLS security tests (functions callable)
- ✅ Quote creation tests (inserts and retrieves)
- ✅ Audit log tests (entries created)

### Step 6: Verify Pricing Engine Build
```bash
# Verify @mailmypdf/pricing package exports
cd packages/pricing
npm run build

# Should build without errors
# Should have dist/index.d.ts with exports:
# - calculateQuote
# - acceptQuote
# - getQuote
# - PricingQuote type
# - CalculateQuoteRequest type
```

### Step 7: Verify Server Functions Build
```bash
# From mailmypdf-all/apps/mailmypdf:
npm run build

# Should build pricing.functions.ts without errors
# Check that pricing.functions has:
# - createPricingQuote
# - verifyPricingQuote
# - acceptPricingQuote
# - getPricingQuoteDetails
```

## Integration Tests

### Step 8: Test Pricing Engine Integration
```typescript
// In browser console or test file:
import { calculateQuote } from "@mailmypdf/pricing";

const quote = await calculateQuote(
  {
    userId: "test-user-id",
    workflowId: "cp2000-response",
    workflowName: "CP2000 Response",
    mailingMethod: "certified",
    baseWorkflowPriceCents: 1900,
    baseMailingPriceCents: 695,
  },
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_URL
);

console.log(quote);
// Expected output:
// {
//   quoteId: "uuid",
//   total: 2744,
//   workflowPrice: 1900,
//   mailingPrice: 745,
//   serviceFee: 99,
//   pricingPolicySlug: "default-public",
//   lineItems: [...]
// }
```

### Step 9: Test Server Functions
```typescript
// From client code:
import { createPricingQuote } from "@/lib/pricing.functions";

const quote = await createPricingQuote.fetch({
  workflowId: "cp2000-response",
  mailingMethod: "certified",
  baseWorkflowPriceCents: 1900,
  baseMailingPriceCents: 695,
});

console.log(quote);
// Should return same structure as direct engine call
```

### Step 10: Test Entitlements Resolution
```sql
-- Create a test user and assign entitlement
INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
VALUES ('test@example.com', now(), '{"full_name": "Test User"}')
RETURNING id AS user_id;

-- Copy the user_id from result

INSERT INTO public.entitlement_assignments (
  user_id,
  entitlement_policy_id,
  assigned_by,
  status
)
VALUES (
  'USER_ID_FROM_ABOVE',
  (SELECT id FROM public.entitlement_policies WHERE slug = 'founders-account'),
  'USER_ID_FROM_ABOVE',
  'active'
);

-- Test pricing with this user
SELECT * FROM public.get_user_entitlements('USER_ID_FROM_ABOVE'::uuid);
-- Should return founders-account policy
```

## Verification Checklist

### Database Schema ✅
- [ ] All 7 tables created
- [ ] All columns have correct types
- [ ] Indexes created for performance
- [ ] RLS enabled and policies set
- [ ] Foreign key constraints in place

### Seed Data ✅
- [ ] 4 pricing profiles loaded
- [ ] 5 entitlement policies loaded
- [ ] Policies reference correct profiles
- [ ] All values correct (prices, discounts, etc.)

### Functions ✅
- [ ] `get_user_entitlements()` works
- [ ] `calculateQuote()` calculates correctly
- [ ] `acceptQuote()` updates database
- [ ] `getQuote()` retrieves from DB

### Server Functions ✅
- [ ] `createPricingQuote()` server function callable
- [ ] `verifyPricingQuote()` validates quotes
- [ ] `acceptPricingQuote()` locks quotes
- [ ] `getPricingQuoteDetails()` returns breakdown

### Security ✅
- [ ] RLS prevents cross-user access
- [ ] Pricing calculated server-side only
- [ ] Client cannot override pricing
- [ ] Audit log records all changes

### Tests ✅
- [ ] All schema tests pass
- [ ] All pricing calculation tests pass
- [ ] All RLS tests pass
- [ ] All CRUD tests pass
- [ ] All audit log tests pass

## Known Limitations (By Design)

- ⚠️ **Quota management not implemented yet** — Tracking free workflow usage (Phase 2)
- ⚠️ **Feature access flags not enforced yet** — Private Office/premium workflows (Phase 2)
- ⚠️ **No UI yet** — Admin panel for assignments (Phase 2)
- ⚠️ **No Stripe integration yet** — Quote acceptance (Phase 3)

## Rollback Plan

If critical issues found:

```bash
# Drop all entitlements tables (DESTRUCTIVE)
supabase migration down
supabase migration down

# Or manually:
DROP TABLE public.entitlements_audit_log;
DROP TABLE public.pricing_quotes;
DROP TABLE public.entitlement_assignments;
DROP TABLE public.entitlement_policies;
DROP TABLE public.pricing_profiles;
DROP TABLE public.organization_members;
DROP TABLE public.organizations;
DROP FUNCTION IF EXISTS public.get_user_entitlements(uuid);

# Re-deploy after fixes
```

## Success Criteria

Phase 1 is complete when:

1. ✅ Database migrations apply without errors
2. ✅ All 7 tables exist with correct schema
3. ✅ Seed data loads (4 profiles, 5 policies)
4. ✅ All unit tests pass
5. ✅ Pricing engine correctly calculates different pricing tiers
6. ✅ Server functions work end-to-end
7. ✅ RLS prevents unauthorized access
8. ✅ Quotes are immutably stored and retrievable
9. ✅ No breaking changes to existing MailMyPDF functionality
10. ✅ Documentation complete

## Next Steps After Phase 1 Success

1. **Phase 2**: Universal dashboard + admin UI
   - User dashboard showing entitlements
   - Admin panel for policy assignments
   - Quota tracking
   - Feature flag integration

2. **Phase 3**: Payment integration
   - Stripe checkout integration
   - Quote validation before payment
   - Accept quote on payment success
   - Refund handling

3. **Workflow Integration**
   - Wire pricing into CP2000 checkout
   - Test full end-to-end flow
   - Rollout to other workflows

## Support

If tests fail:
1. Check error messages carefully
2. Verify Supabase environment variables
3. Check migration file syntax
4. Try running migrations manually in Supabase dashboard
5. Review seed data for conflicts with existing data
6. Check git history for recent changes

## Files to Review Before Deploying

- `apps/mailmypdf/supabase/migrations/20260902000000_core_entitlements_system.sql` (main schema)
- `apps/mailmypdf/supabase/migrations/20260902010000_entitlements_seed_data.sql` (seed data)
- `packages/pricing/src/canonical-pricing-engine.ts` (pricing logic)
- `apps/mailmypdf/src/lib/pricing.functions.ts` (server functions)
- `apps/mailmypdf/tests/entitlements-phase1.test.ts` (tests)
