# Ecosystem Design System Adoption

Small Business is a themed member of the MailMyPDF ecosystem. It must consume the Platform design language without modifying the canonical MailMyPDF product.

## Shared contract
- Typography hierarchy, spacing, density, buttons, inputs, cards, dialogs, tables, badges, navigation, focus states, and motion follow Platform primitives.
- Workflow states use shared READY, APPROVAL_REQUIRED, and BLOCKED semantics and visual treatment.
- Evidence-backed correspondence and AI-generated content are visually distinguishable.
- Responsive and reduced-motion behavior follows the Platform accessibility contract.

## Small Business theme
Use the Platform shared tokens with a restrained teal accent and business-oriented content hierarchy.

## Migration rule
Prefer token/component adoption over one-off CSS. Migrate screens incrementally and preserve business workflow behavior while visual primitives are replaced.
