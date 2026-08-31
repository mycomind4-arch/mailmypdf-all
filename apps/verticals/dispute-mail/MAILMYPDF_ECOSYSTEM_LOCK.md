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

Dispute Mail may have a dispute-specific secondary navigation but MUST NOT replace the global shell.

## Public URLs / SEO

Dispute routes live under `/dispute/*` on `mailmypdf.ai` through the gateway. Preview Pages/Workers hosts are non-canonical. One ecosystem sitemap is served at `mailmypdf.ai/sitemap.xml`. Prelaunch indexing remains disabled until owner launch.

## Identity

One MailMyPDF Account across the ecosystem. Mailing history is authenticated-only. Guest order lookup is limited recovery. Admin access is platform-authorized server-side.

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

## Dispute workflow mapping

- Debt Collection Dispute -> P06
- Collection Agency Dispute -> P06
- Debt Dispute -> P06
- Debt Validation -> P06
- Credit Report Error -> P06
- Credit Report Collections -> P06
- Hard Inquiry -> P06
- Charge-Off Reporting -> P06
- Medical Collections -> P06
- Student Loan Account -> P06
- Credit Card Billing Error -> P06
- Unauthorized Charge -> P06
- Billing Error -> P06
- Subscription Charge -> P06
- Service Contract -> P06
- Insurance Billing / Payment -> P06
- Follow-Up With No Response -> P06
- Escalate Unresolved Dispute -> P06
- Collection Communication Request -> P06

## Gold Standard execution

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

P06 specializes in evidence-grounded factual disputes, discrepancy detection, chronology, authority where required, response strategy, validation, escalation and durable proof.

## Anti-fragmentation

Do not create a separate global navigation, auth model, sitemap strategy, public canonical domain or bespoke workflow engine when the shared architecture applies. Domain-specific dispute intelligence belongs here; shared engines belong in `mailmypdf-platform`.
