# API Route Migration Inventory — Phase 1 Report

## Phase 1: PASSED ✓

### Runtime Proof Summary

| Endpoint | Method | HTTP Status | Response Type | Expected | Result |
|----------|--------|-------------|----------------|----------|--------|
| /api/auth/status | GET | 200 | application/json | JSON, public | ✓ PASS |
| /api/admin/health | GET | 503 | application/json | NOT 404, auth blocks | ✓ PASS |
| /api/workflows/denied-claim/analyze | POST | 401 | application/json | NOT 404, auth blocks | ✓ PASS |
| /api/nonexistent | GET | 404 | text/html | 404 for unknown routes | ✓ PASS |

### Pipeline Verification

| Stage | Status |
|-------|--------|
| Source files (createFileRoute + server.handlers) | ✓ |
| routeTree.gen.ts contains all 3 routes | ✓ (lines 58-60 imports, 315-327 route nodes) |
| .test.ts files excluded from route tree | ✓ (routeFileIgnorePattern: "\.test\.") |
| Worker bundle contains all 3 handlers | ✓ (router-dEuxCz5n.mjs) |
| Start manifest lists all 3 routes | ✓ (_tanstack-start-manifest) |
| Cloudflare wrangler local runtime | ✓ (wrangler pages dev) |
| 364/364 tests green | ✓ |
| 33 workflows registered | ✓ |
| MailMyPDF branding intact | ✓ |

### Security: SUPABASE_SERVICE_ROLE_KEY

- Worker bundle: 6 references — ALL are `process.env.SUPABASE_SERVICE_ROLE_KEY` (variable name only)
- Client assets: 1 reference — `{}.SUPABASE_SERVICE_ROLE_KEY` (checks empty object, no value)
- No actual JWT/secret values found anywhere in the bundle
- **VERDICT: SAFE — no credential exposure**

---

## Migration Inventory: 131 API Route Files

### Already Converted (3 files)

| File | Methods | Auth | Notes |
|------|---------|------|-------|
| src/routes/api/auth/status.ts | GET | public | Phase 1 representative |
| src/routes/api/admin/health.ts | GET | admin | Phase 1 representative |
| src/routes/api/workflows/denied-claim/analyze.ts | POST | auth+rawBody | Phase 1 representative |

### GROUP A — Straightforward Migration (63 files)

**Mechanically safe.** Single HTTP method, standard auth pattern, no unusual body parsing.
Migration: `createAPIFileRoute("/path")({ METHOD: handler })` → `createFileRoute("/path")({ server: { handlers: { METHOD: handler } } })`

**A.1 — approve.ts files (31 files):** POST, requireAuthenticatedUser, no raw body
```
src/routes/api/workflows/car-insurance-appeal/approve.ts
src/routes/api/workflows/claim-denial-letter/approve.ts
src/routes/api/workflows/court-ruling/approve.ts
src/routes/api/workflows/denied-claim/approve.ts
src/routes/api/workflows/dental-insurance-appeal/approve.ts
src/routes/api/workflows/drivers-license-suspension/approve.ts
src/routes/api/workflows/edd-denial/approve.ts
src/routes/api/workflows/fafsa-appeal/approve.ts
src/routes/api/workflows/financial-aid-appeal/approve.ts
src/routes/api/workflows/financial-aid-reinstatement/approve.ts
src/routes/api/workflows/financial-aid-special-circumstances/approve.ts
src/routes/api/workflows/financial-aid-suspension-appeal/approve.ts
src/routes/api/workflows/government-decision/approve.ts
src/routes/api/workflows/insurance-claim-denial/approve.ts
src/routes/api/workflows/insurance-coverage-denial/approve.ts
src/routes/api/workflows/insurance-denial-letter/approve.ts
src/routes/api/workflows/license-revocation-appeal/approve.ts
src/routes/api/workflows/license-suspension-appeal/approve.ts
src/routes/api/workflows/life-insurance-denial/approve.ts
src/routes/api/workflows/medicaid-denial/approve.ts
src/routes/api/workflows/medical-insurance-denial/approve.ts
src/routes/api/workflows/medical-necessity-appeal/approve.ts
src/routes/api/workflows/out-of-network-denial/approve.ts
src/routes/api/workflows/prior-authorization-denial/approve.ts
src/routes/api/workflows/reconsideration/approve.ts
src/routes/api/workflows/sap-appeal/approve.ts
src/routes/api/workflows/scholarship-appeal/approve.ts
src/routes/api/workflows/social-security-denial/approve.ts
src/routes/api/workflows/ssdi-denial/approve.ts
src/routes/api/workflows/ssi-denial/approve.ts
src/routes/api/workflows/unemployment-denial/approve.ts
```

**A.2 — draft.ts files (31 files):** POST, requireAuthenticatedUser, no raw body
```
src/routes/api/workflows/car-insurance-appeal/draft.ts
src/routes/api/workflows/claim-denial-letter/draft.ts
src/routes/api/workflows/court-ruling/draft.ts
src/routes/api/workflows/denied-claim/draft.ts
src/routes/api/workflows/dental-insurance-appeal/draft.ts
src/routes/api/workflows/drivers-license-suspension/draft.ts
src/routes/api/workflows/edd-denial/draft.ts
src/routes/api/workflows/fafsa-appeal/draft.ts
src/routes/api/workflows/financial-aid-appeal/draft.ts
src/routes/api/workflows/financial-aid-reinstatement/draft.ts
src/routes/api/workflows/financial-aid-special-circumstances/draft.ts
src/routes/api/workflows/financial-aid-suspension-appeal/draft.ts
src/routes/api/workflows/government-decision/draft.ts
src/routes/api/workflows/insurance-claim-denial/draft.ts
src/routes/api/workflows/insurance-coverage-denial/draft.ts
src/routes/api/workflows/insurance-denial-letter/draft.ts
src/routes/api/workflows/license-revocation-appeal/draft.ts
src/routes/api/workflows/license-suspension-appeal/draft.ts
src/routes/api/workflows/life-insurance-denial/draft.ts
src/routes/api/workflows/medicaid-denial/draft.ts
src/routes/api/workflows/medical-insurance-denial/draft.ts
src/routes/api/workflows/medical-necessity-appeal/draft.ts
src/routes/api/workflows/out-of-network-denial/draft.ts
src/routes/api/workflows/prior-authorization-denial/draft.ts
src/routes/api/workflows/reconsideration/draft.ts
src/routes/api/workflows/sap-appeal/draft.ts
src/routes/api/workflows/scholarship-appeal/draft.ts
src/routes/api/workflows/social-security-denial/draft.ts
src/routes/api/workflows/ssdi-denial/draft.ts
src/routes/api/workflows/ssi-denial/draft.ts
src/routes/api/workflows/unemployment-denial/draft.ts
```

**A.3 — admin/appeals.ts:** GET, requireAdmin, standard JSON response
```
src/routes/api/admin/appeals.ts
```

### GROUP B — Multiple HTTP Methods (0 files)

None found. All endpoints have exactly one HTTP method.

### GROUP C — Dynamic Route Parameters (2 files)

**Requires manual review.** Uses `params.workflowId` from the route path.

| File | Methods | Auth | Notes |
|------|---------|------|-------|
| src/routes/api/workflows/$workflowId/analyze.ts | POST | auth+rawBody | Dynamic param + file upload + AI analysis |
| src/routes/api/workflows/$workflowId/draft.ts | POST | auth | Dynamic param + JSON body |

**Migration concern:** The `params` object in `createFileRoute` handlers should work the same way, but `$workflowId` is a TanStack Router dynamic segment. Need to verify the handler receives `params` correctly in the `server.handlers` pattern.

### GROUP D — Webhooks/Stripe Endpoints (32 files)

**Requires manual review.** Stripe integration with special body handling.

**D.1 — stripe-webhook.ts (1 file):** POST, NO auth, raw body for Stripe signature verification
```
src/routes/api/stripe-webhook.ts
```
**Critical:** This endpoint uses `request.text()` to get the raw body for Stripe signature verification. The `createFileRoute` handler receives `{ request }` — same `Request` object — so `request.text()` should work identically. However, this is the only endpoint with NO auth check (Stripe verifies via signature), so it needs careful testing.

**D.2 — checkout.ts files (31 files):** POST, requireAuthenticatedUser, Stripe checkout session creation
```
src/routes/api/workflows/*/checkout.ts (31 files, one per workflow)
```
**Migration concern:** These use `request.json()` for input and create Stripe checkout sessions. The `request.json()` call should work the same way in the new pattern. Lower risk than D.1 because they have auth.

### GROUP E — Unusual/Custom Handling (31 files)

**E.1 — analyze.ts files (30 files):** POST, requireAuthenticatedUser, raw body (multipart form data / file upload)
```
src/routes/api/workflows/*/analyze.ts (30 files, one per workflow except denied-claim which is already converted)
```
**Migration concern:** These endpoints handle file uploads via `request.formData()`. The handler receives `{ request }` in both patterns, so `request.formData()` should work identically. Still, file upload is a higher-risk area — should test one representative endpoint before bulk migration.

**E.2 — fafsa-appeal/certify.ts (1 file):** GET, NO auth, returns workflow metadata
```
src/routes/api/workflows/fafsa-appeal/certify.ts
```
**Unusual because:** This is the only GET endpoint without auth (besides auth/status). It returns static workflow metadata. Mechanically safe to migrate but should verify the `GET` handler works correctly in the new pattern.

---

## Summary

| Group | Count | Migration Risk | Auto-migrate? |
|-------|-------|----------------|---------------|
| Already converted | 3 | — | — |
| A (standard) | 63 | Low | YES |
| B (multi-method) | 0 | — | — |
| C (dynamic params) | 2 | Medium | Manual review first |
| D (Stripe/webhooks) | 32 | Medium | Manual review first |
| E (raw body/special) | 31 | Medium | Manual review first |
| **Total** | **131** | | |

### Recommended Phase 2 approach:

1. **Auto-migrate GROUP A (63 files)** — mechanically safe, same pattern as the 3 already converted
2. **Manually inspect GROUP C (2 files)** — verify `params` works in `server.handlers` pattern
3. **Manually inspect GROUP D.1 (1 file)** — verify raw body / Stripe signature works
4. **Test-migrate GROUP D.2 (1 checkout.ts)** — verify Stripe checkout still works, then auto-migrate remaining 30
5. **Test-migrate GROUP E.1 (1 analyze.ts)** — verify file upload works, then auto-migrate remaining 29
6. **Manually migrate GROUP E.2 (1 file)** — simple but unique pattern

### Regression targets to preserve:
- 364/364 tests ✓
- 33 workflows ✓
- 33 workflow URLs (31 dedicated + 2 via dynamic $workflowId) ✓
- MailMyPDF branding ✓
- Deployment cache protection ✓
- Account architecture ✓
- RLS/ownership protections ✓
