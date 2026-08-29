# MailMyPDF Workflow Pricing Standard — LOCKED

**Status:** LOCKED
**Applies to:** every executable workflow and every public workflow landing page

## Principle

Every workflow must show pricing before checkout. Pricing must be straightforward, honest, workflow-specific, and profitable after fulfillment costs. No workflow may advertise one misleading flat price when the final physical mailing can materially change with page count, sheets, color, envelope type, evidence volume, or mail service.

## Customer-facing formula

`workflow preparation fee + included response pages + additional response/supporting-document pages + mailing service + explicit optional services`

The checkout estimate must be calculated from the actual final document packet before payment.

## Page vs. sheet rules

- Price physical **sheets**, not merely PDF page count, when duplex printing is used.
- Response pages and supporting-document pages may have different rates when the workflow economics justify it.
- The pricing calculator must account for duplex printing and envelope/flat-mail thresholds.
- Supporting evidence is never silently included as “free” when it materially increases fulfillment cost.
- The final payable price must be shown before payment.

## Workflow-specific pricing profiles

Each workflow definition owns a pricing profile rather than inheriting one universal selling price.

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

## Market-positioning guardrails

Current market examples show transparent online mail pricing around $2.05 for a one-page standard B&W letter at Postmarkr, $4.99 starting First-Class pricing at The Letter Pilot, approximately $11 starting Certified Mail at The Letter Pilot, and $11.49 for 1–8 sheets at OnlineCertifiedMail. These are reference points, not targets that must be copied. Pricing must preserve the value of AI-assisted analysis, drafting, authority handling, review gates, document preparation, and proof while remaining competitive.

## Recommended starting framework

- Simple workflow preparation: generally **$12.99–$24.99**.
- Complex administrative/licensing workflow preparation: generally **$24.99–$39.99**.
- Response pages included: typically **3 pages** for ordinary workflows; higher inclusions may be justified for complex workflows.
- Additional response B&W sheets: target **$0.35–$0.50** each.
- Supporting-document B&W sheets: target **$0.20–$0.35** each.
- Standard mailing: target **$4.99–$5.99** starting price.
- Certified: target **$10.99–$14.99** starting range, depending on included proof/service value.
- Certified + electronic return receipt: separate explicit add-on.
- Registered: workflow-specific, generally materially above Certified because the underlying fulfillment cost is materially higher.
- Flat/large-envelope fee: explicit where physical size requires it.

These are starting guardrails, not permanent prices. Each workflow must be modeled against current provider cost, USPS cost, taxes/fees, expected AI cost, support burden, failure/retry reserve, and target gross margin before launch.

## Pricing transparency requirements

Landing pages must show:

- “Starting at” price tied to a clearly stated packet assumption.
- What the starting price includes.
- Included response-page allowance.
- How additional evidence/supporting pages are priced.
- Available mailing methods and their prices.
- Any envelope/flat or color-printing surcharge.
- An example total for a representative packet.
- A statement that the exact price is calculated from the final approved packet before payment.

## Unit economics gate

Before a workflow is marked Gold/production-ready, its pricing profile must demonstrate:

1. Fulfillment cost coverage.
2. AI/inference cost coverage.
3. Payment-processing coverage.
4. Reasonable support and retry reserve.
5. Positive target gross margin after variable costs.
6. No materially misleading advertised starting price.

## Pricing architecture

Pricing logic belongs in the shared pricing engine in `mailmypdf-platform` when the capability is cross-vertical. A workflow may define its profile and domain-specific assumptions locally, but must not duplicate the global calculation engine.

## Source discipline

Market and USPS assumptions must be periodically reverified. Current reference examples include Postmarkr, The Letter Pilot, OnlineCertifiedMail, and USPS pricing materials. Prices can change; production pricing must not be hard-coded from an old research snapshot.

## Retroactive requirement

Workflows #1–#5 must be retrofitted to this pricing standard after the initial Gold build. Workflow #6 onward must include the pricing profile during the initial Gold implementation.
