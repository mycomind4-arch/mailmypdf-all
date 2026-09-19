# Ecosystem Vertical Migration Map

## Product model

MailMyPDF is the parent delivery/proof platform. The original ten verticals remain functional legacy workflows inside the MailMyPDF application. The next-generation versions live in standalone repositories and will replace the corresponding legacy workflows one at a time.

### Current next-generation products

| Legacy workflow | Next-generation home | Status |
|---|---|---|
| AppealReply | `mycomind4-arch/appeal-mail` | Active replacement |
| NoticeResponse | `mycomind4-arch/notice-respond` | Active replacement |
| Mail a PDF | `mycomind4-arch/mailmypdf` | Core platform |

### Next standalone homes

| Legacy workflow | New repository | Current state |
|---|---|---|
| TenantReply | `mycomind4-arch/tenant-reply` | Blueprint; build next |
| ClaimProof / insurance correspondence | `mycomind4-arch/insurance-claims` | Blueprint; build next |
| BenefitsAppeal | `mycomind4-arch/benefits-appeal` | Blueprint; build next |
| PermitReply | `mycomind4-arch/permit-response` | Blueprint; architecture decision pending |
| DebtDefense | `mycomind4-arch/debt-defense` | Blueprint; validate against DisputeMail |

`mycomind4-arch/case-evidence` is platform infrastructure, not a consumer vertical. It should provide reusable evidence/provenance/timeline primitives rather than appear as a customer-facing product.

## Migration rule

Do **not** copy a single legacy route file into a new repository and call it migrated. The legacy verticals rely on the MailMyPDF monolith's shared components, providers, services, routes, and environment contracts. A correct migration must preserve those dependencies or replace them with explicit platform contracts.

Each replacement should therefore be migrated as a coherent application with:

1. shared MailMyPDF design tokens and visual language;
2. the vertical's complete workflow and data model;
3. authentication and document handling;
4. vertical-specific AI/analysis capabilities;
5. a clear MailMyPDF delivery/proof handoff;
6. independent SEO/canonical URLs;
7. a redirect/deprecation plan for the old monolith route.

## Navigation rule

- **Solutions** = the ten existing functional legacy workflows until each is replaced.
- **Ecosystem** = the next-generation standalone products currently being rolled out.
- A replacement becomes the canonical customer destination only after it is functionally verified.

This prevents broken links, duplicate products, and SEO cannibalization while the migration is underway.
