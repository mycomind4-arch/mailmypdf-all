# Notice Respond — Canonical SEO Site Structure

This is the canonical SEO/content architecture. It does **not** change the ecosystem-wide navigation, authenticated routes, workflow runtime, or existing public URLs. Existing workflow URLs remain valid and should be preserved.

## Public structure
- `/` — vertical pillar: respond to government notices; what it does; notice types; how it works; what to gather; AI handles heavy lifting; review; mailing/proof; featured workflows; FAQ; start.
- `/workflows` — workflow hub: find your situation, search/discovery, choosing a workflow, category navigation, crawlable links to every workflow.
- `/how-it-works` — upload → AI understands → AI organizes facts/evidence → AI builds response → review/approve → MailMyPDF sends → track/preserve proof.
- `/products` — Notice Respond within the MailMyPDF ecosystem.
- `/pricing` — pricing.
- `/mail-a-pdf` — Mail a PDF.
- `/about`, `/contact`, `/faq`, `/resources/*` — supporting SEO/footer content.
- `/privacy`, `/terms`, `/404` — legal/error pages.

## Workflow SEO model
Vertical pillar → workflow hub → individual workflow authority page → authenticated workflow.

Keep every existing workflow URL. New search-intent variants may be added as aliases/canonical authority pages, but never replace or remove an existing working workflow route merely to simplify the sitemap.

## Auth/account — not primary SEO navigation
- `/auth/*`
- `/dashboard`
- `/account`
- `/workflows/analyze`

These remain functional application routes and should not be treated as public SEO landing-page navigation.

## UX rule
The public experience stays simple. Users should see the smallest useful number of choices; AI performs document analysis, fact extraction, deadline detection, evidence organization, issue identification, strategy assistance, drafting, validation, recipient checks, mailing preparation, and proof generation underneath the simple experience.

## Navigation lock
Do **not** add vertical-specific navigation items to the ecosystem shell. The canonical ecosystem navigation remains authoritative.


## Live Workflow Routes (2026-08-27)

All 18 production workflows have live interactive routes:

- /workflows/cp2000-response, /workflows/cp14-response, /workflows/cp504-response, /workflows/cp523-response
- /workflows/irs-notice, /workflows/tax-notice, /workflows/court-summons, /workflows/agency-action, /workflows/file-appeal
- /workflows/code-enforcement, /workflows/permit-correction, /workflows/dmv-notice
- /workflows/ssa-notice, /workflows/uscis-notice, /workflows/benefits-notice
- /workflows/transunion-dispute, /workflows/experian-dispute, /workflows/equifax-dispute

Legacy SEO-only routes (/workflows/respond-to-*) now 301-redirect to their canonical interactive routes.
