# Notice Respond — Gold Vertical Audit

Reference implementation: Appeal Mail / MailMyPDF Gold Standard.

## Current repository state

- Canonical workflow registry: `src/domain/workflow-catalog.ts`
- Legacy adapter: `src/domain/workflows.ts`
- MailMyPDF platform adapter already exists: `src/platform/mailmypdf.ts`
- Supabase repository + RLS schema exist: `src/platform/supabase-repository.ts`, `supabase/schema.sql`
- Workflow engine already includes consequential review/approval/submission/proof enforcement.

## Implemented in this milestone

- MailMyPDF Account authentication context added at `src/lib/auth.tsx`.
- Root application now provides MailMyPDF Account context.
- Supabase browser sessions now persist and auto-refresh.
- `/auth` is a real sign-in/sign-up/magic-link/reset experience rather than a launch waitlist.
- `/account` now provides MailMyPDF Account settings and profile management.
- Header identifies Notice Respond as a MailMyPDF product and exposes account actions.
- Footer identifies the MailMyPDF ecosystem and links the shared account.
- Dashboard access is gated on a configured, authenticated MailMyPDF Account.
- Analysis Studio access is gated on a configured, authenticated MailMyPDF Account.
- Auth state synchronizes the authenticated user ID into the existing owner context used by the case repository.

## Major remaining Gold gaps

1. **Server-side route/API boundary**
   Notice Respond currently performs much of the analysis/drafting flow directly in the client route (`src/routes/workflows/analyze.tsx`). The next architectural milestone should move consequential operations behind server handlers and platform boundaries rather than trusting browser execution for protected business operations.

2. **Admin/RBAC**
   Notice Respond has no equivalent of Appeal Mail's centralized server-side admin endpoints. Admin authorization should use the MailMyPDF role model and never rely on client-only flags.

3. **Document upload integration**
   `src/platform/mailmypdf.ts` already targets the canonical MailMyPDF `/v1/documents` contract, but the existing Analysis Studio currently begins with pasted notice text and performs client-side extraction. The Gold flow should use the shared MailMyPDF document service for uploaded notices.

4. **Consequential pipeline wiring**
   The domain engine now enforces review → approval → submission → proof gates, but the application-level UI/API path needs to pass real consequential state through those gates and connect submission to the shared communications service.

5. **Shared account/dashboard ecosystem**
   Account identity is now shared conceptually, but the case/dashboard model remains vertical-specific. A later milestone should connect shared MailMyPDF account context to shared product/account navigation without duplicating identity.

6. **Production deployment/domain**
   The permanent canonical domain should be `https://notice-respond.pages.dev`. Deployment and canonical metadata should be standardized after the application architecture is aligned.

7. **SEO/marketing**
   Apply Appeal Mail's proven P0 SEO foundation after platform/account architecture is stable: sitemap, robots, canonicals, metadata, schema, workflow landing layers, analytics, then revenue-weighted content expansion.

## Non-negotiable architecture

MailMyPDF owns identity, documents/storage, communications, AI control-plane configuration, billing, and shared platform infrastructure.

Notice Respond owns notice-specific workflow definitions, notice classification/extraction, deadlines, response strategy, drafting rules, readiness logic, and product UX.

Verticals consume platform capabilities; they do not duplicate them.
