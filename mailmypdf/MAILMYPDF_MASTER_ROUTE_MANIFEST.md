# MailMyPDF Master Public Route Manifest

This manifest freezes the public information architecture for the unified `mailmypdf.ai` ecosystem.

The gateway is the public routing layer. Individual repos may own implementation behind these paths.

## Core

- `/`
- `/send`
- `/write`
- `/pricing`
- `/ecosystem`
- `/resources`
- `/templates`
- `/proof-of-service`
- `/verify`

## Account

Authenticated only:

- `/dashboard`
- `/dashboard/orders`
- `/dashboard/products`
- `/dashboard/settings`
- `/account/profile`
- `/account/security`
- `/account/preferences`

Admin only:

- `/admin`
- `/admin/orders`
- `/admin/users`
- `/admin/products`
- `/admin/fulfillment`
- `/admin/payments`
- `/admin/seo`
- `/admin/system`

## Product families

### Appeal

- `/appeal`
- `/appeal/insurance-denial`
- `/appeal/medical-denial`
- `/appeal/ssdi-denial`
- `/appeal/ssi-denial`
- `/appeal/social-security-denial`
- `/appeal/medicaid-denial`
- `/appeal/unemployment-denial`
- `/appeal/financial-aid-appeal`
- `/appeal/license-suspension`
- `/appeal/government-decision`
- `/appeal/reconsideration`

### Notice

- `/notice`
- `/notice/irs`
- `/notice/irs-cp2000`
- `/notice/court-summons`
- `/notice/agency-action`
- `/notice/file-appeal`
- `/notice/respond-to-notice`

### Immigration

- `/immigration`
- `/immigration/uscis`
- `/immigration/request-for-evidence`
- `/immigration/notice-of-intent-to-deny`
- `/immigration/notice-of-intent-to-revoke`
- `/immigration/biometrics`
- `/immigration/supporting-documents`
- `/immigration/explanation-letter`

### Dispute

- `/dispute`
- `/dispute/credit-report`
- `/dispute/debt-validation`
- `/dispute/unauthorized-charge`
- `/dispute/billing-error`
- `/dispute/identity-theft`
- `/dispute/consumer-dispute`

### Small Business

- `/business`
- `/business/letters`
- `/business/customer-notices`
- `/business/vendor-notices`
- `/business/payment-demand`
- `/business/collections`
- `/business/approvals`

### Additional future product families

- `/records`
- `/records/request`
- `/tenant`
- `/tenant/reply`
- `/permit`
- `/permit/reply`
- `/benefits`
- `/benefits/appeal`
- `/claim`
- `/claim/proof`
- `/future`

## Placeholder behavior

Routes without an active implementation should resolve through the gateway to a product-aware placeholder page. Placeholder pages are intentionally part of the permanent IA and are not to be removed simply because implementation is deferred.

Placeholder pages must include:

- canonical page title
- H1 matching the route/product intent
- concise explanation of the intended workflow
- ecosystem navigation
- link to `/send`
- link to the relevant product family
- no false claim that the workflow is currently executable

The site owner will control search indexing at launch. During pre-launch, route completeness and navigation completeness take priority over search visibility.
