# Gold Standard Integration Status

Updated: 2026-08-20

Notice Respond remains the reference implementation for the MailMyPDF workflow family.

## Verified architecture

- Canonical workflow definitions and engine registry exist.
- Generic workflow runtime exists and is used by production routes.
- CP2000 has dedicated discrepancy, evidence, strategy, research, validation, case, provenance, and pack modules.
- CP14 has the most mature authority-level implementation.
- Production mailing is represented through the shared MailingFunnel/provider boundary, but the current browser path still targets a missing `/api/mail/response` route and therefore cannot be called deployed-executable yet.
- The runtime now fail-closes document advancement until extraction exists.
- Review completion no longer implies authorization; explicit `approveWorkflow()` is required.
- Forward navigation cannot skip consequential runtime gates.
- Runtime regression coverage includes validation-before-draft, no direct jumps, explicit approval, provider-transition requirements, terminal-state blocking, and document-extraction gating.

## Current integration blockers

1. **CP2000 approval UX** — the review screen exposes review checkboxes but does not yet invoke `approveWorkflow()`, so the explicit authorization gate is not reachable from that route.
2. **Mailing endpoint boundary** — `src/components/mailing-funnel.tsx` posts to `/api/mail/response`, but no matching route is registered in the current TanStack Start route tree.
3. **Deployment certification** — the real provider path, tracking, proof, and deployed smoke flow still need verification.

## Certification rule

A workflow is not Gold because its definition lists capabilities. Gold requires executable domain modules, connected production routes, fail-closed consequential gates, and successful regression/integration tests.

The next code task is to resolve the actual TanStack Start mailing boundary and add the explicit approval affordance without weakening the generic runtime gates.
