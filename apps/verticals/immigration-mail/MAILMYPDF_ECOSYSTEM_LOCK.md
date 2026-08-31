# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

## Global shell

Shared global navigation:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated: `Dashboard` · `Mailing History` · `Account`
Platform-authorized administrator: `Admin`

Immigration Mail may have product-specific secondary navigation but MUST NOT fork the global shell.

## Public URLs / SEO

Immigration routes live under `/immigration/*` on `mailmypdf.ai` through the gateway. Preview Pages/Workers hosts are non-canonical. One ecosystem sitemap is served at `mailmypdf.ai/sitemap.xml`. Prelaunch indexing remains disabled until owner launch.

## Identity

One MailMyPDF Account across products. Mailing history requires authentication. Guest order lookup is limited recovery. Admin authorization is server-side and platform-scoped.

## Pipeline archetypes — LOCKED

10 core variants:
- P01 Core Mail / Correspondence
- P02 Notice / Official Response
- P03 Appeal / Reconsideration
- P04 Court / Formal Proceeding
- P05 Immigration Evidence / Response
- P06 Dispute / Investigation
- P07 Business Automation
- P08 Records / Information Request
- P09 Regulatory / Permit / Rights Response
- P10 Claim / Proof / Evidence Package

## Immigration workflow mapping

- Respond to a Notice -> P05
- Submit Supporting Documents -> P05
- Prepare an Explanation Letter -> P05

## Gold Standard execution

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

P05 emphasizes document classification, agency identification, requested-action extraction, immigration-specific evidence requirements, source grounding, deadline handling and careful human review before mailing.

## Anti-fragmentation

Do not create separate navigation, authentication, sitemap, canonical-domain or pipeline architecture. Domain-specific immigration intelligence belongs in this repo; reusable engines belong in `mailmypdf-platform`. Exceptions require documentation in the platform repo.
