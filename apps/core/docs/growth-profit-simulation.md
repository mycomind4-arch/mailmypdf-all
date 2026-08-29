# MailMyPDF Growth + Profit Simulation

## Purpose
This model is the decision framework for optimizing MailMyPDF for customer growth and contribution profit at the same time. It separates traffic, conversion, order mix, repeat behavior, Pro adoption, fulfillment cost, payment cost, and customer-acquisition cost.

The goal is not to predict one exact future. It is to identify strategies that remain attractive across conservative, base, and upside conditions.

## Current pricing baseline
The application derives order pricing from `src/lib/pricing.ts`:

- 1–2 pages: $4.99
- 3–5 pages: $6.99
- 6–10 pages: $9.99
- Color: +$0.15/page
- Certified: +$9.95
- Registered: +$27.50

Pro derives from `src/lib/subscriptions.ts`:

- $9.99/month
- 5 standard letters included per billing period
- $3.99 for additional letters
- color/certified/registered remain add-ons

These values should remain single-source-of-truth values in code.

## Simulation dimensions
Each monthly simulation should model acquisition, funnel conversion, order mix, customer behavior, economics, and seasonality.

### Acquisition
- organic/search sessions
- paid sessions
- referral sessions
- direct sessions
- blended CAC

### Funnel
- landing-page → composer start
- composer start → address/document completion
- completion → checkout
- checkout → paid order

### Order mix
- 1–2 pages
- 3–5 pages
- 6–10 pages
- color attachment rate
- certified attachment rate
- registered attachment rate

### Customer behavior
- first-order conversion
- second-order probability
- monthly repeat frequency
- Pro adoption
- Pro churn
- reactivation

### Economics
- fulfillment cost
- Stripe/payment fees
- refunds
- support cost
- acquisition cost
- subscription revenue
- contribution profit

### Seasonality
- tax season
- government-notice season
- legal/document spikes
- baseline months

## Scenario assumptions
These are simulation inputs, not claims about current performance.

### Conservative
- 1.5% visitor → paid-order conversion
- 1.3 orders per new customer in first 90 days
- 2% Pro adoption
- higher paid acquisition mix
- 5% refund/failed-order leakage
- 10% monthly Pro churn

### Base
- 2.5% visitor → paid-order conversion
- 1.7 orders per new customer in first 90 days
- 4% Pro adoption
- balanced organic/referral/paid acquisition
- 3% refund/failed-order leakage
- 7% monthly Pro churn

### Upside
- 4.0% visitor → paid-order conversion
- 2.4 orders per new customer in first 90 days
- 8% Pro adoption
- organic/referral majority
- 2% refund/failed-order leakage
- 5% monthly Pro churn

## Pricing experiments
Do not immediately replace the current pricing. Run controlled tests against it.

### Variant A — Current control
$4.99 / $6.99 / $9.99

This preserves the low-friction acquisition wedge.

### Variant B — Premium convenience
$5.99 / $7.99 / $10.99

Only test this after baseline funnel data shows strong willingness to pay.

### Variant C — Keep entry price, improve monetization
Keep $4.99 / $6.99 / $9.99 and test stronger post-purchase Pro conversion, clearer add-ons, saved recipients, reorder, and referral credit.

This is the preferred first experiment because it seeks higher revenue without risking the acquisition wedge.

## Pro strategy
Pro should not be positioned as a generic discount subscription. It should target people who expect to mail repeatedly.

Best conversion moment:
1. First order succeeds.
2. User sees proof/tracking confirmation.
3. Offer: “Mail regularly? Save with Pro.”
4. Show savings based on actual usage.
5. Offer one-click upgrade.

## Growth priorities
### Tier 1
- high-intent SEO pages
- recipient/address convenience
- reorder from previous letters
- transparent checkout pricing
- post-order tracking/proof
- referral incentive after successful delivery
- excellent mobile composer
- excellent first-order experience

### Tier 2
- “mail this document” browser/share workflow
- Gmail/Drive upload
- saved templates
- recurring reminders
- organization API
- government/legal/landlord/insurance use-case pages

### Tier 3
- broad marketplace integrations
- complex team permissions
- white-labeling
- enterprise billing
- large automation platform

The product should win the single-letter job before becoming a mail infrastructure platform.

## Unit economics
Track contribution margin, not revenue alone:

- revenue/order
- fulfillment cost/order
- payment fee/order
- contribution/order
- CAC
- first-order contribution after CAC
- 90-day contribution per acquired customer
- Pro LTV
- refund rate
- successful-delivery rate

Decision rule:

`Incremental contribution = incremental orders × contribution/order + incremental subscription contribution - incremental acquisition/support/refund cost`

Ship an experiment only when the expected result is positive in the base case and does not create unacceptable downside in the conservative case.

## Recommended posture
Keep $4.99 as the control until real funnel data proves users are relatively price-insensitive.

The strongest near-term path to more profit is:

**increase completed orders → increase repeat orders → monetize high-frequency users with Pro → monetize trust-sensitive users with Certified/Registered → lower CAC through SEO/referrals.**

This preserves the low-friction reason to try MailMyPDF while building higher customer lifetime value.