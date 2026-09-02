# MailMyPDF Entitlements Phase 2: Testing & Verification

**Status:** Testing Plan  
**Phase:** 2 (Dashboard & Admin UI)  
**Date:** 2026-09-02

---

## Overview

Phase 2 implements the authenticated dashboard and admin entitlements manager. This guide provides step-by-step verification that all components function correctly, RLS policies hold, and the user experience matches design specifications.

---

## Pre-Test Checklist

- [ ] Phase 1 database migrations applied (`20260902000000_core_entitlements_system.sql`)
- [ ] Phase 1 seed data loaded (`20260902010000_entitlements_seed_data.sql`)
- [ ] All Phase 1 tests passing
- [ ] Dev server running (`npm run dev`)
- [ ] Authenticated as test user (mycomind4@gmail.com)

---

## Dashboard Tests

### D1: Dashboard Loads Without Errors

**Route:** `/workspace`  
**Expected:** Authenticated users see dashboard

**Steps:**
1. Login as regular user
2. Navigate to `/workspace`
3. Should see greeting with time-appropriate message
4. Active Work section loads (even if empty)
5. Recent Mailings section loads
6. Benefits panel displays

**Verification:**
- [ ] No console errors
- [ ] Page renders in < 2 seconds
- [ ] All sections are visible

---

### D2: Greeting Message is Time-Appropriate

**Expected:** Message changes based on time of day

**Verify:**
- [ ] 6am-11:59am: "Good morning"
- [ ] 12pm-5:59pm: "Good afternoon"
- [ ] 6pm-11:59pm: "Good evening"

**Test:**
```javascript
// In browser console:
new Date().getHours() // Should match greeting
```

---

### D3: Entitlements Fetched Correctly

**Expected:** User sees their active policy and benefits

**Test with Founder Account user:**
1. Login as user assigned "Founder Account" policy
2. Dashboard loads benefits section
3. Verify displayed values:
   - Workflows: FREE (normally $19.00)
   - Certified Mail: $7.45 (normally $10.94)
   - Service Fees: WAIVED
   - Private Office: INCLUDED

**Verify:**
- [ ] Benefits display correct normal pricing
- [ ] Benefits display correct actual pricing
- [ ] Savings calculation is accurate
- [ ] Policy name shows correctly

---

### D4: Benefits Calculation is Accurate

**Formula verification:**
```
For each benefit:
- workflowSavings = normalPrice - actualPrice
- For Founder Account: $19.00 - $0.00 = $19.00 savings
- For Partner Attorney: $19.00 - $9.50 = $9.50 savings (50% off)
```

**Test:**
1. Create test user with each policy
2. Check benefits on dashboard
3. Calculate savings manually
4. Verify displayed savings matches calculation

---

### D5: Active Work Section (When Implemented)

**Expected:** Shows active workflows across verticals

**When workflow_runs table is populated:**
- [ ] Draft workflows appear
- [ ] In-progress workflows appear
- [ ] Waiting for approval workflows appear
- [ ] Click navigates to workflow
- [ ] Correct status icon displays

---

### D6: Recent Mailings Section

**Expected:** Shows recent orders for user

**Test:**
1. Create an order as test user
2. Verify it appears in Recent Mailings
3. Verify correct status displays
4. Verify recipient name and service type show

**Verify:**
- [ ] Orders ordered by date (newest first)
- [ ] Status badges show correct colors
- [ ] Order is clickable
- [ ] Max 10 orders displayed

---

### D7: Quick Actions Are Clickable

**Expected:** All action buttons navigate to correct routes

**Test:**
- [ ] "Mail a PDF" → `/send`
- [ ] "Start Workflow" → `/ecosystem`
- [ ] "Mail Again" → `/send`
- [ ] "My Mailings" → `/workspace/mailings`
- [ ] "Settings" → `/workspace/settings`

---

## Admin Entitlements Manager Tests

### A1: Admin Manager Loads

**Route:** `/admin/entitlements`  
**Expected:** Admin user sees search interface

**Steps:**
1. Login as admin user (grant admin role in db)
2. Navigate to `/admin/entitlements`
3. Should see search panel on left, empty details on right

**Verify:**
- [ ] No console errors
- [ ] Search panel visible
- [ ] Search type toggle works (Users/Organizations)
- [ ] Search input enabled

---

### A2: Search Users by Email

**Expected:** Admin can find users by email

**Test:**
1. Search for "mycomind4" in user search
2. Should return mycomind4@gmail.com
3. Click result to select

**Verify:**
- [ ] Results appear after typing 3+ chars
- [ ] Email matches query
- [ ] Name shows from user_profiles

---

### A3: Search Organizations

**Expected:** Admin can find organizations by name or slug

**Test:**
1. Create test org (if needed)
2. Search for org by name
3. Click result to select

**Verify:**
- [ ] Results appear for both name and slug
- [ ] Member count displays

---

### A4: View User Entitlements

**Expected:** Admin sees user's current entitlements

**Test:**
1. Select user with active entitlement
2. Should display in "Active Entitlements" section
3. Shows policy name, profile, status, expiration

**Verify:**
- [ ] Correct policy name displays
- [ ] Correct profile displays
- [ ] Status badge shows (active/paused/expired)
- [ ] Expiration date shows if applicable

---

### A5: Create New Assignment

**Expected:** Admin can assign a new policy to user

**Test:**
1. Search and select a user
2. Click "New Assignment" button
3. Modal appears with policy dropdown
4. Select a policy
5. Click "Assign"

**Verify:**
- [ ] Modal opens
- [ ] Policy dropdown loads all policies
- [ ] Assignment succeeds
- [ ] New entitlement appears in list
- [ ] Audit log entry created

---

### A6: Edit Assignment

**Expected:** Admin can modify expiration date and status

**Test:**
1. Select user with entitlement
2. Click edit (pencil) icon
3. Change expiration date
4. Click save

**Verify:**
- [ ] Modal opens with current values
- [ ] Changes persist
- [ ] Audit log updated
- [ ] UI refreshes

---

### A7: Revoke Assignment

**Expected:** Admin can revoke entitlements

**Test:**
1. Select user with entitlement
2. Click revoke (trash) icon
3. Confirm revocation

**Verify:**
- [ ] Entitlement status changes to "expired"
- [ ] Expires_at is set to now
- [ ] Audit log entry created with "revoke" action
- [ ] UI updates immediately

---

### A8: View Audit Trail

**Expected:** Admin sees history of entitlement changes

**Test:**
1. Select user/org with entitlements
2. Scroll to "Audit Trail" section
3. Should show recent actions

**Verify:**
- [ ] All actions appear (assign, update, revoke)
- [ ] Actor email shows who made change
- [ ] Dates are correct
- [ ] Max 50 entries shown

---

### A9: Link to Policy Manager

**Expected:** Admin can navigate to policy management

**Test:**
1. On entitlements page, click "Manage Policies"
2. Should navigate to `/admin/policies`

**Verify:**
- [ ] Navigation works
- [ ] Policies load on new page

---

## Policy Manager Tests

### P1: Policy List Loads

**Route:** `/admin/policies`  
**Expected:** Admin sees all policies

**Verify:**
- [ ] All 4 seed policies display
- [ ] Policy names, slugs, descriptions show
- [ ] Profile name displays (e.g., "Standard Pricing")
- [ ] Scope badge shows (user/organization)

---

### P2: Create Policy Form (When Implemented)

**Route:** `/admin/policies/new`  
**Expected:** Admin can create custom policies

**Verify** (when implemented):
- [ ] Form loads
- [ ] All required fields present
- [ ] Policy saves successfully
- [ ] Policy appears in policy list
- [ ] Audit log entry created

---

## Security & RLS Tests

### S1: Unauthorized Access Blocked

**Expected:** Non-admins cannot access admin routes

**Test:**
1. Login as regular user
2. Navigate to `/admin/entitlements`
3. Should redirect to auth or show 403

**Verify:**
- [ ] Access denied
- [ ] No error leakage

---

### S2: User Can Only See Own Entitlements

**Expected:** User dashboard only shows own benefits

**Test:**
1. Login as user A
2. Dashboard shows user A's benefits only
3. Login as user B
4. Dashboard shows user B's benefits (different)

**Verify:**
- [ ] Each user sees correct data
- [ ] RLS prevents leakage

---

### S3: Admin Audit Trail Only Shows Own Actions

**Expected:** Audit log respects ownership

**Test:**
1. Admin A assigns policy to User X
2. Admin B views audit log for User X
3. Both should see the action (shared resource)
4. But User X shouldn't see admin name in certain contexts

**Verify:**
- [ ] Audit accessible to all admins
- [ ] Actor email shows correctly

---

## Database Verification

### DB1: Quote Storage

**Query:**
```sql
SELECT id, policy_id, profile_id, assignment_id, pricing_engine_version, created_at
FROM pricing_quotes
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- [ ] All quotes have lineage fields
- [ ] Pricing engine version recorded
- [ ] Never updated (immutable)

---

### DB2: Audit Log Complete

**Query:**
```sql
SELECT action, resource_type, COUNT(*) as count
FROM entitlements_audit_log
GROUP BY action, resource_type;
```

**Expected:**
- [ ] Actions: assign, revoke, update, create_policy
- [ ] Resource types: assignment, policy
- [ ] Each action has entries

---

### DB3: RLS Enforcement

**Test RLS by querying as different roles:**

```sql
-- As public user
SELECT * FROM entitlement_assignments WHERE user_id = 'their-id';
-- Should only see own

-- As admin
SELECT * FROM entitlement_assignments;
-- Should see all
```

---

## Performance Tests

### PERF1: Dashboard Load Time

**Expected:** < 2 seconds initial load

**Measure:**
1. Open browser DevTools
2. Navigate to `/workspace`
3. Check Network tab
4. Total time should be < 2s

**Verify:**
- [ ] DOMContentLoaded < 1.5s
- [ ] All images/assets loaded

---

### PERF2: Search Performance

**Expected:** < 500ms for search query

**Test:**
1. DevTools open
2. Type in search box
3. Results appear in < 500ms

**Verify:**
- [ ] Not freezing
- [ ] Results appear quickly

---

### PERF3: Audit Log Query

**Expected:** < 1s to load 50 audit entries

**Verify:**
- [ ] Network tab shows < 1s query time

---

## Accessibility Tests

### A11Y1: Keyboard Navigation

**Expected:** All interactive elements keyboard accessible

**Test:**
1. Press Tab through dashboard
2. Should hit all buttons, links, form fields
3. Enter/Space should activate buttons

**Verify:**
- [ ] All elements reachable
- [ ] Focus ring visible
- [ ] Tab order makes sense

---

### A11Y2: Color Contrast

**Expected:** Status badges meet WCAG AA (4.5:1)

**Check:**
- [ ] Active (green): 4.5:1+
- [ ] Paused (amber): 4.5:1+
- [ ] Expired (red): 4.5:1+

---

## Edge Case Tests

### E1: User with Multiple Entitlements

**Expected:** Shows all active assignments

**Test:**
1. Assign multiple policies to same user
2. Dashboard shows all in list

**Verify:**
- [ ] All policies display
- [ ] Each shows correct profile/pricing

---

### E2: Expired Entitlements

**Expected:** Doesn't show in active list

**Test:**
1. Create assignment that expires today
2. Dashboard should not show in benefits
3. Admin sees status as "expired"

**Verify:**
- [ ] Hidden from user view
- [ ] Visible to admin for audit

---

### E3: Organization-Level vs User-Level

**Expected:** User-level takes precedence

**Test:**
1. Assign policy to organization
2. All members get benefits
3. Assign different policy to one member
4. Member sees own policy benefits (overrides org)

**Verify:**
- [ ] User override works
- [ ] Query uses correct precedence

---

## Integration Tests

### INT1: End-to-End: Pricing Quote to Assignment

**Expected:** Full flow works

**Test:**
1. User requests pricing quote
2. Pricing engine calculates with entitlements
3. Quote created with assignment_id reference
4. Admin can see full lineage

**Verify:**
- [ ] Quote reflects user's policy
- [ ] Audit trail shows why
- [ ] Quote is immutable

---

### INT2: Dashboard to Checkout

**Expected:** Benefits persist through checkout

**Test:**
1. User sees $0 workflow cost on dashboard
2. Start workflow
3. In checkout, workflow cost is $0
4. Quote respects entitlement

**Verify:**
- [ ] Pricing consistent
- [ ] No double-charging

---

## Success Criteria Checklist

- [ ] D1-D7: Dashboard tests pass
- [ ] A1-A9: Admin manager tests pass
- [ ] P1: Policy list displays
- [ ] S1-S3: Security tests pass
- [ ] DB1-DB3: Database verification passes
- [ ] PERF1-3: Performance acceptable
- [ ] A11Y1-2: Accessibility checks pass
- [ ] E1-E3: Edge cases handled
- [ ] INT1-2: Integration tests pass

**Phase 2 Complete When:** All checkboxes ✓

---

## Regression Testing

After each change in Phase 2, re-run:
1. Dashboard loads (D1)
2. Entitlements fetch (D3)
3. Admin search works (A2)
4. RLS enforced (S2)

---

## Next Steps

When Phase 2 verification complete:
1. Begin Phase 3: Stripe checkout integration
2. Wire pricing engine into Stripe
3. Accept quotes after payment
4. Implement refund logic

---

## Notes

- All test data is seed data from Phase 1
- No production data affected
- Each test is isolated (can run independently)
- Use browser DevTools for network/performance inspection
