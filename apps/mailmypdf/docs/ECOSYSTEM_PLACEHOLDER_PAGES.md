# Ecosystem Placeholder Pages

The canonical public information architecture is now frozen in `MAILMYPDF_MASTER_ROUTE_MANIFEST.md` and `src/lib/master-public-routes.ts`.

The gateway is responsible for resolving planned product/workflow routes even when the corresponding vertical repository is not connected yet.

## Required families

- Appeal
- Notice
- Immigration
- Dispute
- Business
- Records
- Tenant
- Permit
- Benefits
- Claim
- GovReply
- Future

## Placeholder UX

Placeholder pages are intentionally useful rather than "coming soon" marketing:

- explain what the workflow is for
- show the canonical product-family breadcrumb
- provide global MailMyPDF navigation
- offer `Start Mailing` → `/send`
- offer `Explore Products` → `/ecosystem`
- never imply that unavailable automation is already executable

They are part of the permanent route architecture. When a vertical becomes executable, its route is swapped behind the same public URL; navigation and SEO URLs do not change.

## Authentication

- anonymous visitors can browse public product/workflow information
- customer account/history/dashboard pages require authentication
- admin pages require platform admin authorization
- a placeholder must never expose customer data or authenticated history
