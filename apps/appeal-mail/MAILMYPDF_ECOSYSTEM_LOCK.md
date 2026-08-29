# MailMyPDF Ecosystem Lock — Canonical Architecture

**Status: LOCKED**
**Canonical public host:** `https://mailmypdf.ai`
**Cross-repo source of truth:** `mailmypdf-platform`

This file freezes global navigation, identity, SEO, routing, pricing, and pipeline architecture. Appeal Mail remains a specialized product implementation; the public product is part of one MailMyPDF ecosystem.

## Global shell

Use the shared MailMyPDF global navigation:
`MailMyPDF` · `Products` · `How It Works` · `Resources` · `Pricing` · `Account` · `Start Mailing`

Anonymous: `Sign In`
Authenticated: `Dashboard` · `Mailing History` · `Account`
Platform-authorized administrator: `Admin`

Appeal Mail may add a secondary Appeal-specific navigation but MUST NOT replace the global shell.

## Public URLs / SEO

Canonical public host is `mailmypdf.ai`.
Appeal routes live under `/appeal/*` on the gateway.
Do not publish Pages/Workers preview URLs as canonical SEO URLs.
Prelaunch indexing remains disabled until the owner enables launch indexing.
The ecosystem sitemap is generated at `mailmypdf.ai/sitemap.xml`.

## Identity

There is one MailMyPDF Account across products. Mailing history is authenticated-only. Guest order lookup is a narrow recovery feature, not account history. Admin access is server-authorized and role-based.

## Pipeline archetypes — LOCKED

There are 10 core pipelines:

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

**Appeal Mail default:** P03.

## Appeal Mail workflow mapping

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

## Gold Standard execution

Every executable workflow ultimately follows:

`SECURE INGEST -> CLASSIFY -> EXTRACT -> UNDERSTAND -> FACTS + PROVENANCE -> TIMELINE / DEADLINES -> ISSUES / DISCREPANCIES -> EVIDENCE -> AUTHORITY / RESEARCH WHEN REQUIRED -> STRENGTH / RISK -> STRATEGY -> DRAFT -> VALIDATE -> BLOCKING GATES -> HUMAN REVIEW -> FINAL PACKET + PRICE -> AUTHORIZED MAIL -> TRACK -> PROVE / AUDIT`

P03 specializes this contract for appeals with decision analysis, chronology, appeal grounds, evidence linkage, contradiction detection, adversarial stress testing, draft validation, readiness, pricing and proof.

## Workflow pricing — LOCKED

Every workflow landing page MUST display transparent pricing before checkout. Every executable workflow MUST own a workflow-specific pricing profile rather than using one universal selling price.

Customer pricing follows:

`workflow preparation fee + included response pages + additional response/supporting-document pages + mailing service + explicit optional services`

Pricing is calculated from the final approved packet. Physical sheets—not merely PDF page count—are the controlling fulfillment unit when duplex printing or envelope size changes the physical mailing.

Each profile can define:

- preparation fee
- included response sheets/pages
- additional response B&W sheet price
- supporting-document B&W sheet price
- standard mail price
- certified mail price
- certified + return receipt price
- registered mail price
- color-print price when applicable
- flat/large-envelope fee when applicable

Landing pages must show the starting assumption, inclusions, page/evidence pricing, mailing options, an example total, and a clear statement that the exact total is calculated before payment.

Gold/production readiness requires fulfillment cost coverage, AI/inference coverage, payment-processing coverage, retry/support reserve, and a positive target gross margin without a materially misleading starting price.

The shared pricing calculator belongs in `mailmypdf-platform`; workflows provide their profile and domain-specific assumptions.

Current competitive reference points include Postmarkr at $2.05 starting B&W standard mail, The Letter Pilot at $4.99 starting First-Class and $11.00 starting Certified Mail, and OnlineCertifiedMail at $11.49 for 1–8 sheets. These are market reference points only and must be reverified before launch pricing is finalized.

## Anti-fragmentation

Do not create a separate global navigation, auth model, sitemap strategy, canonical domain, pricing calculator, or pipeline for an Appeal Mail workflow when the shared architecture applies. Vertical-specific intelligence and pricing profiles belong here; shared engines belong in `mailmypdf-platform`.

Any architectural exception must be documented in `mailmypdf-platform` before implementation.
