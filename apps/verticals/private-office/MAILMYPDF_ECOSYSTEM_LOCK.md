# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

## Global shell

Shared global navigation:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated: `Dashboard` · `Mailing History` · `Account`

Private Office may have a matter-specific secondary navigation but MUST NOT replace the global shell.

## Public URLs / SEO

Private Office routes live under `/private-office/*` on `mailmypdf.ai` through the gateway. Preview Pages/Workers hosts are non-canonical. One ecosystem sitemap is served at `mailmypdf.ai/sitemap.xml`. Prelaunch indexing remains disabled until owner launch.

## Identity

One MailMyPDF Account across the ecosystem. Mailing history is authenticated-only. Admin access is platform-authorized server-side.

## Pipeline archetypes

- Contractor Dispute -> P06 (Dispute/Investigation) + P10 (Claim/Proof/Evidence Package)

## Gold Standard execution

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

## Anti-fragmentation

Do not create a separate global navigation, auth model, sitemap strategy, public canonical domain or bespoke workflow engine when the shared architecture applies. Matter-specific intelligence belongs here; shared engines belong in `mailmypdf-platform`.
