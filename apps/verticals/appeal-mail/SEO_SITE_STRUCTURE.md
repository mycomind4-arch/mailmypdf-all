# Appeal Mail — Canonical SEO Site Structure

Preserve the ecosystem-wide navigation exactly as implemented. This document defines the SEO/content hierarchy, not a new navigation system. Do not remove working routes.

## Public
- `/` — Appeal Mail pillar: appeal decisions, denials and adverse determinations; what it does; appeal types; how it works; what to gather; AI handles the heavy lifting; review; mailing/proof; featured workflows; FAQ; start.
- `/workflows` — Appeal Workflows hub: find your situation, search/discovery, choosing an appeal workflow, category hubs, crawlable links to every authority page.
- `/how-it-works` — upload decision → AI understands → AI organizes facts/evidence → AI builds appeal → review/approve → MailMyPDF sends → track/preserve proof.
- `/products`, `/pricing`, `/mail-a-pdf` — ecosystem/product pages.
- `/about`, `/contact`, `/faq`, `/resources/*` — supporting SEO/footer content.
- `/privacy`, `/terms`, `/404` — legal/error.

## Workflow taxonomy
General decisions & denials; insurance appeals; Social Security & disability; government benefits; financial aid & education; license & DMV; additional specialized appeals.

## SEO flow
Pillar → workflow hub → specific authority page → authenticated workflow. Preserve existing `/appeal/:slug` SEO pages and existing `/workflows/*` URLs. Add aliases only when they represent a distinct search intent; never delete a working URL.

## Application routes
Keep `/auth/*`, `/dashboard`, `/account`, and workflow-entry routes functional but outside primary SEO navigation.

## Simplicity rule
The interface should expose only the decisions the user needs to make. AI performs the analysis, fact/evidence organization, deadline detection, appeal-ground analysis, drafting and validation underneath the simple workflow. The user reviews and approves the exact draft.

## Navigation lock
No vertical-specific menu additions. The MailMyPDF ecosystem shell remains the sole public navigation standard.
