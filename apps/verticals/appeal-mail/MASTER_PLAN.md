# Appeal Mail — Master Plan

**Status: LOCKED / ACTIVE**
**Last updated:** 2026-08-22
**Canonical architecture:** MailMyPDF Ecosystem Lock
**Shared platform source of truth:** `mailmypdf-platform`

## Product objective

Build Appeal Mail as a polished MailMyPDF vertical in which every workflow is a real authority-first product, not a thin landing page or generic letter generator.

Every workflow must connect:

`Landing page → secure upload → document intelligence → authority/procedure verification → evidence/contradiction analysis → strategy → Gemini drafting → independent validation → readiness → human approval → transparent custom pricing → Stripe → final deterministic PDF → MailMyPDF document storage → MailMyPDF communication → provider submission → tracking → proof`

## Gold Standard workflow requirements

Every executable workflow must provide:

1. A complete authority-first landing page with search intent, authoritative-source education, procedural limitations, evidence guidance, FAQs, related workflows, conversion CTA, pricing, mailing, tracking, and proof.
2. An executable domain pack with deterministic capability declarations and Gold certification tests.
3. Strict source-grounded AI behavior. Gemini is the current configured provider through the MailMyPDF AI control plane; workflows may receive workflow-specific prompts/model configuration.
4. No invented deadlines, filing destinations, recipients, forms, exhaustion requirements, eligibility rules, hearing rights, judicial-review paths, facts, or outcomes.
5. Separate analysis, drafting, and validation concerns.
6. Human approval before paid mailing.
7. Deterministic final-response PDF generation.
8. MailMyPDF-owned document storage and communication/mailing APIs.
9. Idempotent fulfillment and provider-backed status/proof.
10. Workflow-specific pricing that reflects actual physical packet complexity.

## Pricing — LOCKED REQUIREMENT

Pricing is a first-class part of every workflow and is required for Gold/production readiness.

### Customer pricing formula

`workflow preparation fee + included response pages + additional response/supporting-document pages + mailing service + explicit optional services`

### Physical-unit rules

- Price physical **sheets** when duplex printing or envelope size changes fulfillment.
- Do not pretend supporting evidence is free when it materially increases printing/handling cost.
- The exact payable price must be calculated from the final approved packet before payment.
- Every workflow has its own pricing profile.

### Pricing profile

```ts
pricing: {
  preparationFee: number,
  includedResponsePages: number,
  responsePagePrice: number,
  supportingPagePrice: number,
  standardMail: number,
  certifiedMail: number,
  certifiedReturnReceipt?: number,
  registeredMail?: number,
  flatEnvelopeFee?: number,
  colorPagePrice?: number,
}
```

### Starting guardrails

These are modeling ranges, not immutable prices:

- Simple workflow preparation: **$12.99–$24.99**.
- Complex administrative/licensing preparation: **$24.99–$39.99**.
- Typical included response allowance: **3 pages**.
- Additional response B&W sheet: **$0.35–$0.50**.
- Supporting-document B&W sheet: **$0.20–$0.35**.
- Standard mailing starting point: **$4.99–$5.99**.
- Certified starting point: **$10.99–$14.99** depending on service/proof included.
- Registered and return-receipt services must be modeled separately.
- Flat/large-envelope charges must be explicit when triggered.

### Market reference points

Current online-mail competitors show a broad transparent range. Postmarkr lists $2.05 starting for a one-page B&W letter and $0.20 per additional B&W page; The Letter Pilot lists $4.99 starting First-Class and $11.00 starting Certified Mail; OnlineCertifiedMail lists $11.49 for 1–8 sheets. These are reference points, not targets. citeturn931734search1turn931734search2turn931734search0

USPS pricing must be treated as a changing input rather than hard-coded forever; current 2026 reference material shows First-Class and Certified Mail rates changing with USPS updates. citeturn931734search11turn931734search5

### Profitability gate

Before a workflow is production-ready, its pricing model must cover:

- fulfillment/postage;
- printing and envelope costs;
- AI/inference;
- payment processing;
- support/retry/failure reserve;
- expected operational overhead attributable to the order;
- target positive gross margin.

Starting prices may be lower than the fully loaded expected cost only during controlled testing; production landing pages must not advertise a materially misleading price.

### Page-pricing UX

Each workflow landing page must display:

- starting price and assumption;
- preparation fee;
- included response pages;
- additional response/supporting page rates;
- mailing-method prices;
- optional services/surcharges;
- representative example total;
- exact-price-before-payment statement.

## Workflow rollout

### Completed Gold builds

- Workflow #1: Denied Claim — existing flagship; must receive pricing retrofit.
- Workflow #2: Government Decision — PR #2; must receive pricing retrofit.
- Workflow #3: Agency Decision Appeal — PR #3; must receive pricing retrofit.
- Workflow #4: Administrative Decision Appeal — PR #4; must receive pricing retrofit.
- Workflow #5: Licensing Appeal — PR #5; must receive pricing retrofit.

### Next

Workflow #6 and onward must include workflow-specific pricing from the first implementation commit.

### Retroactive work

After the next workflow build cycle, retrofit #1–#5 to the shared pricing engine and unified pricing UX. Do not duplicate pricing calculation logic inside each workflow.

## Shared architecture

- MailMyPDF Account is the canonical identity.
- MailMyPDF owns document storage/upload.
- MailMyPDF owns communications/mailing.
- Appeal Mail owns workflow/domain logic, readiness gates, Stripe checkout, and client UX.
- `mailmypdf-platform` owns shared engines and cross-vertical contracts.
- New cross-vertical pricing calculation belongs in `mailmypdf-platform`.

## Execution policy

- Work directly on feature branches.
- Open a PR to `main` for each workflow.
- Never claim Gold certification until repository verification/CI evidence exists.
- Keep commentary minimal; report only when a workflow is done and ready for the next one.
- Preserve the locked ecosystem architecture while expanding vertical-specific intelligence.
