# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

This contract freezes global navigation, identity, SEO, routing, and pipeline architecture. Product repos remain independently deployable, but the public product is one MailMyPDF ecosystem.

## Public architecture

```text
mailmypdf.ai
  -> Gateway / Router
     -> Core App: mailmypdf
     -> Vertical Apps: appeal-mail, notice-respond, immigration-mail, dispute-mail, mailmypdf-smallbusiness
     -> Platform APIs: mailmypdf-platform
```

## Global navigation

Shared global shell:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated customer: `Dashboard` · `Mailing History` · `Account`
Platform-authorized admin: `Admin`

Verticals may add product-specific secondary navigation but MUST NOT fork the global shell.

## Identity and auth

One conceptual identity: **MailMyPDF Account**.

- Mailing history requires authentication.
- Guest order lookup is limited recovery, not general history.
- Admin authorization is server-side and role-based.
- Products consume the shared identity contract; they do not invent separate account models.

## Canonical SEO

All public SEO value consolidates under `mailmypdf.ai`.

Core routes include `/`, `/send`, `/write`, `/templates`, `/ecosystem`, `/how-it-works`, `/resources`, `/pricing`.

Product families:
`/appeal/*`, `/notice/*`, `/immigration/*`, `/dispute/*`, `/business/*`, `/records/*`, `/tenant/*`, `/permit/*`, `/benefits/*`, `/claim/*`, `/govreply/*`, `/future/*`.

Prelaunch indexing is disabled until the owner's launch switch. One ecosystem sitemap is served from `mailmypdf.ai/sitemap.xml`.

## Gateway / placeholders

Precedence:
1. Exact implemented route
2. Connected vertical route
3. Stable placeholder

Every placeholder keeps the canonical URL, shared navigation, correct auth state, product-family context, and a link to `/send`, without claiming unfinished functionality is live.

## Pipeline archetypes — LOCKED

There are **10 pipeline variants**. Workflows select a primary pipeline plus domain adapters and optional specialist modules.

- **P01 Core Mail / Correspondence** — simple letters, PDFs, templates, routine correspondence, direct mailing, tracking, proof.
- **P02 Notice / Official Response** — government/agency notices, formal requests, CP2000/IRS-style responses.
- **P03 Appeal / Reconsideration** — denials, adverse decisions, reconsiderations, appeal packages, stress testing.
- **P04 Court / Formal Proceeding** — summonses, formal court papers, procedural response packages.
- **P05 Immigration Evidence / Response** — immigration notices, evidence submissions, explanation letters.
- **P06 Dispute / Investigation** — debt, collections, credit, billing, unauthorized charges, investigations, escalation.
- **P07 Business Automation** — triggered business correspondence, approvals, scheduling, risk, execution, audit.
- **P08 Records / Information Request** — records/public-information requests, scope, custodians, deadlines, production.
- **P09 Regulatory / Permit / Rights Response** — permits, licensing, housing/tenant formal responses, regulatory corrections.
- **P10 Claim / Proof / Evidence Package** — evidence-heavy claims where provenance, chronology, custody and proof are first-class.

## Gold Standard pipeline contract

Every executable workflow follows:

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

Catalog presence does not mean executable. Unknown remains unknown. AI output is untrusted until grounded and validated.

## Workflow assignments

### Core
- Mail a PDF -> P01
- Write a Letter -> P01
- Send a Letter -> P01
- Templates -> P01
- Future Self -> P01
- Proof of Mailing / Service -> P01 + proof/audit modules

### Appeal Mail
- Denied Claim -> P03
- Government Decision -> P03
- Reconsideration -> P03
- Insurance Claim Denial -> P03
- Insurance Denial Letter -> P03
- Insurance Coverage Denial -> P03
- Medical Insurance Denial -> P03
- Medical Necessity Denial -> P03
- Prior Authorization Denial -> P03
- Out-of-Network Denial -> P03
- Dental Insurance Appeal -> P03
- Car Insurance Appeal -> P03
- Life Insurance Denial -> P03
- Claim Denial Letter -> P03
- SSDI Denial -> P03
- SSI Denial -> P03
- Social Security Denial -> P03
- Medicaid Denial -> P03
- Unemployment Denial -> P03
- EDD Denial -> P03
- Financial Aid Appeal -> P03
- SAP Appeal -> P03
- Financial Aid Suspension Appeal -> P03
- Financial Aid Reinstatement -> P03
- Financial Aid Special Circumstances -> P03
- Scholarship Appeal -> P03
- FAFSA Appeal -> P03
- License Suspension Appeal -> P09 + P03
- Driver's License Suspension -> P09 + P03
- License Revocation Appeal -> P09 + P03
- DMV Suspension Appeal -> P09 + P03
- Registration Suspension Appeal -> P09 + P03

### Notice Respond
- IRS Notice -> P02
- CP2000 Response -> P02
- Agency Action -> P02
- Court Summons -> P04
- File an Appeal -> P03

### Immigration Mail
- Respond to a Notice -> P05
- Supporting Documents -> P05
- Explanation Letter -> P05

### Dispute Mail
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

### Small Business
- Payment Reminder -> P07
- Payment Demand -> P07
- Contract Renewal -> P07
- Compliance Notice -> P07
- Customer Dispute Response -> P07

### Future product families
- Records Request -> P08
- Tenant Reply -> P09; evidence-heavy variants may add P10
- Permit Reply -> P09
- Benefits Appeal -> P03
- Claim Proof -> P10
- GovReply -> P02; evidence-heavy variants may add P10

## Domain adapter rule

Platform owns reusable infrastructure: documents, extraction contracts, provenance, evidence, contradictions, timelines, deadlines, risk, validation, security, audit, fulfillment, tracking, proof.

Verticals own domain intelligence: classification, domain facts, rules/authorities, issue detection, strategy, drafting requirements.

**Pipeline + Domain Adapter + Specialist Modules = Executable Workflow.**

## Anti-fragmentation rules

Do not create another global navigation, canonical domain, ecosystem sitemap strategy, customer identity concept, or bespoke pipeline when an existing archetype fits. Do not duplicate platform engines in verticals. Do not expose authenticated history publicly. Do not mark placeholders executable.

Any exception must be documented in `mailmypdf-platform` before implementation.

## Definition of done

A workflow is **Gold Standard / Executable** only when its pipeline, domain adapter, dependencies, security, tests, mailing/tracking/proof path and deployed verification all pass.
