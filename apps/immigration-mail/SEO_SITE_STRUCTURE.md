# Immigration Mail — Canonical SEO Site Structure

Preserve the ecosystem-wide navigation exactly as implemented. This defines SEO/content hierarchy only and must not remove or rename working application routes.

## Public
- `/` — Immigration Mail pillar: respond to immigration notices and requests; what it does; correspondence types; how it works; what to gather; AI handles the heavy lifting; review; mailing/proof; featured workflows; FAQ; start.
- `/workflows` — Immigration Workflows hub with search/discovery, situation selection, category navigation, and crawlable authority links.
- `/how-it-works` — upload notice → AI understands request → organize facts/evidence → build response → review/approve → MailMyPDF sends → track/preserve proof.
- `/products`, `/pricing`, `/mail-a-pdf` — ecosystem/product pages.
- `/about`, `/contact`, `/faq`, `/resources/*` — supporting SEO/footer content.
- `/privacy`, `/terms`, `/404` — legal/error.

## Workflow taxonomy
USCIS notices & requests; immigration applications; visa & consular matters; family immigration; employment immigration; immigration denials & appeals; general immigration.

## SEO flow
Pillar → workflow hub → specific authority page → authenticated workflow. Preserve every existing `/workflows/*` URL and add search-intent variants only as genuine authority pages/aliases.

## Application routes
Keep `/auth/*`, `/dashboard`, `/account`, `/start`, `/workflows/analyze`, and authenticated workflow routes functional but outside primary SEO navigation.

## Simplicity rule
Users make only the decisions they need to make. AI performs notice/form identification, fact extraction, deadline detection, evidence organization, issue identification, response strategy, drafting and validation underneath the simple experience. User-provided and document-derived facts remain distinguishable.

## Navigation lock
Do not add vertical-specific navigation. The ecosystem shell is authoritative.
