# Ecosystem Design System Adoption

Immigration Mail is a themed member of the MailMyPDF ecosystem. It must consume the Platform design language without modifying the canonical MailMyPDF product.

## Shared contract
- Typography hierarchy and readable density are shared.
- Buttons, inputs, cards, dialogs, tables, badges, navigation, focus states, and motion follow Platform primitives.
- Consequential actions use the shared review/approval treatment.
- Evidence, AI-generated content, and authoritative sources remain visually distinguishable.
- Responsive and reduced-motion behavior follows the Platform accessibility contract.

## Immigration theme
Use the Platform shared tokens with a restrained violet accent. Do not introduce a second component vocabulary merely for branding.

## Migration rule
Prefer token/component adoption over one-off CSS. Existing screens should be migrated incrementally; do not rewrite domain workflows merely for visual consistency.
