# MailMyPDF Optimization Blueprint

## Objective

Optimize for sustainable contribution profit, not vanity revenue. The primary flywheel is:

**first successful order → proof/trust → repeat order → Pro → referral/SEO acquisition**.

Do not raise the entry price until real funnel data shows that price is not the primary conversion constraint.

## North-star metrics

Track these weekly and monthly:

- visitor → paid order conversion
- checkout completion rate
- average order value
- contribution dollars per order
- repeat-order rate at 30/90 days
- orders per customer in 90 days
- Pro attach rate after first successful order
- Pro monthly churn
- CAC by acquisition channel
- 90-day contribution per acquired customer
- refund/failed-order rate
- successful fulfillment rate
- delivery/proof page engagement

## Funnel to optimize

1. Landing page visit
2. Send/write flow started
3. Document/address completed
4. Price understood
5. Checkout started
6. Payment completed
7. Mailing accepted
8. Tracking/proof viewed
9. Second order
10. Pro conversion
11. Referral

Instrument every transition. Never change multiple high-impact variables simultaneously unless the experiment is factorial by design.

## Product strategy

### First order

Make the core promise extremely clear:

> **Mail a letter or PDF without a printer.**

The user should understand that printing, envelope, postage, and mailing are handled before they are asked to learn about advanced services.

Primary actions:

- Upload PDF
- Write a letter

Keep the $4.99 starting price visible and show the actual total before payment.

### Checkout

Use progressive disclosure:

1. recipient
2. document
3. mail class
4. optional color
5. final price
6. payment

Do not lead with Certified/Registered options unless the user indicates a need for them.

### After successful delivery

Turn the confirmation page into the retention engine:

- show tracking/proof clearly
- save recipient/address with permission
- offer “Mail again”
- offer template/reuse
- after a successful order, present Pro based on actual expected savings

Recommended Pro message:

> **Mail regularly? Save with Pro.**
> 5 standard letters every month for $9.99.

Do not push Pro aggressively before the customer has experienced successful fulfillment.

## Pricing experiments

### Control

1–2 pages: $4.99
3–5 pages: $6.99
6–10 pages: $9.99
Color: +$0.15/page
Certified: +$9.95
Registered: +$27.50

### Experiment 1 — monetization without raising entry price

Keep base prices unchanged. Improve:

- reorder
- saved addresses
- post-order Pro offer
- service add-on explanation
- referral incentive

This is the preferred first experiment.

### Experiment 2 — premium price

Test $5.99 / $7.99 / $10.99 only after enough baseline conversion data exists.

Success requires positive incremental contribution, not merely higher revenue per order.

## Acquisition strategy

### Highest priority

Build high-intent pages around jobs rather than generic printing keywords:

- mail a PDF
- mail a letter without a printer
- send certified mail online
- send a letter to a landlord
- mail tax documents online
- send documents by mail online
- prove a letter was mailed
- mail a government response
- print and mail a document

Every SEO page should have one obvious action into the actual send/write flow.

### Referral loop

After a successful delivery, ask for a referral rather than immediately asking for a review.

Possible structure:

> **Know someone who needs to mail a letter?**
> Give them a first-order credit and receive credit after their completed order.

Keep the reward economically bounded by contribution margin.

## Retention features

Prioritize in this order:

1. saved recipients
2. saved return address
3. order history
4. one-click reorder
5. saved templates
6. reusable documents
7. reminders
8. recurring workflows

These features increase repeat frequency without materially increasing fulfillment complexity.

## Trust strategy

MailMyPDF sells confidence as much as physical postage.

The product should make these states obvious:

**Prepared → Paid → Mailed → Accepted → Tracking → Delivered → Proof**

Never imply that MailMyPDF guarantees USPS delivery or recipient action.

Certified Mail copy should describe delivery/attempt confirmation. Recipient signature should only be mentioned when a signature/return-receipt service is actually included.

## Experiment decision rule

For each experiment calculate:

`incremental contribution = incremental order contribution + incremental Pro contribution - incremental CAC - incremental support/refund cost`

Ship when:

- base-case contribution is positive
- conservative downside is acceptable
- fulfillment/support burden is acceptable
- the experiment does not materially damage trust or clarity

## What not to build yet

Avoid premature complexity:

- enterprise permissions
- white-label platform
- broad marketplace
- large automation suite
- complex team billing
- API-first positioning

Win the single-letter job first.

## Simulation

`src/lib/growth-simulation.ts` contains the deterministic scenario model used to compare conversion, repeat behavior, CAC, Pro adoption, refunds, and contribution.

The model is deliberately separate from checkout/runtime logic so product experiments can be evaluated without introducing business logic into the payment path.

Replace modeled assumptions with observed analytics as data accumulates.

## Definition of “optimized”

MailMyPDF should not be called fully optimized until the following are measured from real users:

- first-order conversion
- average contribution/order
- 30-day repeat rate
- 90-day orders/customer
- Pro attach rate
- Pro churn
- CAC by channel
- 90-day contribution/CAC
- refund rate
- fulfillment failure rate

Optimization is a continuous control loop, not a one-time redesign.
