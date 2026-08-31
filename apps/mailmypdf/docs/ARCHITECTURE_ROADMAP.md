# MailMyPDF — Architecture Roadmap for 100K Users

**Generated:** 2026-07-24
**Author:** Lead Software Architect Review

---

## Executive Summary

MailMyPDF is a TanStack Start + Supabase application that lets users mail PDFs and letters via Lob, paid through Stripe Checkout. The codebase is well-structured for its current scale (~14K lines, clean separation of server functions) but has several gaps that would block a production launch and limit horizontal scaling.

This document defines a four-phase roadmap. Only Phase 1 is implemented in this iteration.

---

## Phase 1 — Immediate Launch Blockers

**These must be fixed before accepting real customer payments.**

### 1.1 Secrets tracked in git
- `.env` is committed to the repo and contains `STRIPE_SANDBOX_API_KEY` and `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
- **Fix:** Add `.env` to `.gitignore`, `git rm --cached .env`, update `.env.example`
- **Risk:** HIGH — if repo is ever public/compromised, all payment keys are leaked
- **Effort:** 30 minutes

### 1.2 No rate limiting on order creation or email recovery
- `createOrder`, `createLetterOrder`, and `requestOrderRecoveryEmail` have no rate limiting
- An attacker can flood Supabase storage with 10MB PDFs or spam any email via recovery
- **Fix:** In-memory sliding window rate limiter (upgrade to Redis/Supabase for multi-instance)
- **Risk:** HIGH — abuse vector, storage cost, email spam
- **Effort:** 2 hours

### 1.3 No request IDs / correlation
- No way to trace a request through logs across the system
- `console.error` calls have no request context
- **Fix:** Middleware that generates a request ID, attaches to headers and log context
- **Risk:** MEDIUM — can't debug production incidents
- **Effort:** 1 hour

### 1.4 No centralized config validation at startup
- `process.env` access scattered across 8+ files
- Missing env vars only fail at runtime when the specific code path is hit
- **Fix:** Centralized typed config module with startup validation (Task 1)
- **Risk:** MEDIUM — runtime failures in production
- **Effort:** 4 hours

### 1.5 Webhook handler uses `any` types
- `markOrderPaid(session: any, ...)` and `markOrderFailed(sessionOrIntent: any)` have no type safety
- Could miss metadata bugs that cause silent order failures
- **Fix:** Type the webhook event objects properly
- **Risk:** MEDIUM — silent order fulfillment failures
- **Effort:** 1 hour

---

## Phase 2 — Production Hardening

### 2.1 Centralized Configuration System (Task 1)
- Typed interfaces for Stripe, Lob, Supabase, Email, Storage, Feature Flags, URLs, Scheduled Jobs
- Validation at startup, fail-fast for missing required config
- Eliminate all direct `process.env` access outside config module
- **Impact:** Maintainability, runtime safety
- **Complexity:** Low-Medium
- **Effort:** 1 day
- **Dependencies:** None
- **Acceptance:** No `process.env` outside `src/config/`, app fails to start if required config is missing

### 2.2 Feature Flag System (Task 2) ✅ COMPLETED
- Typed flags, central registry, environment overrides
- Replace scattered boolean checks (`autoSubmitEnabled()`, `isLobConfigured()`, `isConfigured()`)
- **Impact:** Operational control, safe rollouts
- **Complexity:** Low
- **Effort:** 4 hours
- **Dependencies:** 2.1 (Config System)
- **Acceptance:** All feature gates go through flag system, flags documented

### 2.3 Order State Machine (Task 3) ✅ COMPLETED
- Replace string-based status with finite state machine
- Explicit transitions, transition guards, typed errors, transition history
- Illegal transitions fail at runtime
- **Impact:** Prevents invalid state transitions, improves debugging
- **Complexity:** Medium
- **Effort:** 1 day
- **Dependencies:** None
- **Acceptance:** All status transitions go through state machine, unit tests for every transition

### 2.4 Domain Layer (Task 4) ✅ COMPLETED
- Separate Domain / Application / Infrastructure / Providers
- Interfaces for MailProvider, PaymentProvider, NotificationProvider, StorageProvider
- Refactor Lob and Stripe behind interfaces
- **Impact:** Testability, swappability, clean architecture
- **Complexity:** Medium-High
- **Effort:** 2 days
- **Dependencies:** 2.1 (Config System)
- **Acceptance:** Lob and Stripe implementations behind interfaces, domain logic has no infrastructure dependencies

### 2.5 Lob Hardening (Task 5) ✅ COMPLETED
- Retries with exponential backoff, timeout handling, request logging
- Webhook recovery, address validation before submission
- Idempotency verification, margin reporting
- **Impact:** Reliability of physical mail delivery
- **Complexity:** Medium
- **Effort:** 1 day
- **Dependencies:** 2.4 (Domain Layer)
- **Acceptance:** Lob failures retry with backoff, address validated before submission, all requests logged

### 2.6 Stripe Production Readiness (Task 6) ✅ COMPLETED
- Switch from hand-rolled webhook verification to Stripe SDK constructEvent
- Verify idempotency, metadata integrity, refund support
- Tests for duplicate events, failed payments, async payments
- **Impact:** Payment reliability, correctness
- **Complexity:** Medium
- **Effort:** 1 day
- **Dependencies:** 2.4 (Domain Layer)
- **Acceptance:** Webhook verified via SDK, refund flow tested, all edge cases covered

### 2.7 Security Hardening (Task 7) ✅ COMPLETED
- CSP, HSTS, X-Frame-Options, secure headers
- Rate limiting (from Phase 1, upgraded to Redis/Supabase)
- Structured audit logging, upload validation improvements
- **Impact:** Security posture, compliance readiness
- **Complexity:** Medium
- **Effort:** 1 day
- **Dependencies:** 2.1 (Config System)
- **Acceptance:** Security headers present, rate limiting active, audit log for sensitive operations

### 2.8 Observability (Task 8) ✅ COMPLETED
- Structured logging (replace all console.log/error)
- Metrics: provider latency, retry counts, fulfillment times, payment metrics
- Distributed tracing with request IDs (from Phase 1, expanded)
- **Impact:** Production debugging, SLI/SLO monitoring
- **Complexity:** Medium
- **Effort:** 1 day
- **Dependencies:** 2.1 (Config System)
- **Acceptance:** Every request traceable, provider latency tracked, structured logs with context

---

## Phase 3 — Scalability

### 3.1 Admin Dashboard Expansion (Task 9) ✅ COMPLETED
- Revenue, orders, failures, retries, webhook health, provider latency
- Customer metrics, AOV, filters, search
- **Impact:** Operational visibility
- **Complexity:** Medium
- **Effort:** 2 days
- **Dependencies:** 2.8 (Observability)
- **Acceptance:** Dashboard shows all listed metrics with filters

### 3.2 Code Quality (Task 12)
- Remove dead code, duplicate logic, magic numbers
- Standardize naming, imports, folder structure
- Fix all `any` types
- **Impact:** Maintainability
- **Complexity:** Low-Medium
- **Effort:** 1 day
- **Dependencies:** None (can start anytime)
- **Acceptance:** No `any` types in lib/, no magic numbers, lint passes clean

### 3.3 SEO Route Consolidation
- 30+ SEO landing page routes are separate files with duplicated structure
- Consolidate into template + data-driven routes
- **Impact:** Code maintainability, bundle size
- **Complexity:** Low
- **Effort:** 4 hours
- **Dependencies:** None
- **Acceptance:** SEO routes use shared template, no duplicated logic

---

## Phase 4 — Enterprise Features

### 4.1 Revenue Platform (Task 10)
- Organizations, teams, shared templates, reusable recipients
- Address books, saved drafts, API readiness, subscription hooks
- **Impact:** Product expansion, recurring revenue
- **Complexity:** High
- **Effort:** 1-2 weeks
- **Dependencies:** 2.4 (Domain Layer), 2.1 (Config System)
- **Acceptance:** Multi-tenant support, API access, subscription billing

### 4.2 Documentation (Task 11)
- Architecture diagrams, sequence diagrams, deployment guide
- Configuration guide, webhook docs, Stripe/Lob setup guides
- ADRs, troubleshooting guide
- **Impact:** Onboarding, maintainability
- **Complexity:** Low
- **Effort:** 2 days
- **Dependencies:** All prior phases
- **Acceptance:** Full documentation suite covering all subsystems
