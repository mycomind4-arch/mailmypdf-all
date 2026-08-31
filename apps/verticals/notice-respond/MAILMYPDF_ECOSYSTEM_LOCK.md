# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

## Global shell

Shared MailMyPDF navigation is mandatory:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated: `Dashboard` · `Mailing History` · `Account`
Platform-authorized administrator: `Admin`

Notice Respond may have a secondary notice-specific navigation, but it does not replace the global shell.

## Public URL / SEO

Notice Respond public routes live under `/notice/*` on `mailmypdf.ai` through the gateway. Preview Pages/Workers hosts are not canonical. One ecosystem sitemap is served from `mailmypdf.ai/sitemap.xml`. Prelaunch indexing remains disabled until owner launch.

## Identity

One MailMyPDF Account across the ecosystem. Mailing history is authenticated-only. Guest order lookup is limited recovery. Admin access is server-side platform authorization.

## Pipeline archetypes — LOCKED

10 core pipeline variants:
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

## Notice Respond workflow mapping

- IRS Notice -> P02
- CP2000 Response -> P02
- Agency Action -> P02
- Court Summons -> P04
- File an Appeal -> P03

## Gold Standard execution

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

Notice Respond is the reference implementation for workflow depth and quality. Domain-specific tax, agency, court and government intelligence belongs in Notice Respond; shared engines belong in the platform.

## Anti-fragmentation

Do not create another global navigation, auth system, public canonical domain, sitemap architecture, or bespoke pipeline. Do not mark placeholder workflows executable. Exceptions require documentation in `mailmypdf-platform`.
