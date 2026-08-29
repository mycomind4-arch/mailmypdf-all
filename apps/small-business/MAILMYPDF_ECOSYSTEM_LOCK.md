# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

## Global shell

Shared MailMyPDF navigation:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated: `Dashboard` · `Mailing History` · `Account`
Platform-authorized administrator: `Admin`

Small Business may add business-specific secondary navigation but MUST NOT fork the global shell.

## Public URLs / SEO

Small Business routes live under `/business/*` on `mailmypdf.ai` through the gateway. Preview Pages/Workers hosts are non-canonical. One ecosystem sitemap is served at `mailmypdf.ai/sitemap.xml`. Prelaunch indexing remains disabled until owner launch.

## Identity

One MailMyPDF Account across the ecosystem. Mailing history requires authentication. Guest order lookup is limited recovery. Admin access is server-side platform authorization.

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

## Small Business workflow mapping

- Payment Reminder -> P07
- Payment Demand -> P07
- Contract Renewal -> P07
- Compliance Notice -> P07
- Customer Dispute Response -> P07

P07 is trigger-aware and must preserve risk classification, approval gates, scheduling, authorized execution and auditability.

## Gold Standard execution

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

For triggered workflows, the trigger/context phase precedes secure execution and is normalized into the same traceable case/workflow record.

## Anti-fragmentation

Do not create separate global navigation, customer identity, sitemap, public domain or pipeline architecture. Business-specific rules, triggers, approvals and CRM integrations belong here; shared document/evidence/fulfillment/audit infrastructure belongs in `mailmypdf-platform`.
