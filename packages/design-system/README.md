# MailMyPDF design system

This package is the shared UI contract for the MailMyPDF ecosystem. Vertical
apps own their content, workflow catalog, and route adapters; this package owns
the reusable visual language and surface primitives.

## Surface entry points

- `@mailmypdf/design-system/public` — unauthenticated landing pages and public chrome.
- `@mailmypdf/design-system/auth` — authenticated workspace and workflow UI.
- `@mailmypdf/design-system/admin` — admin/control-plane shell primitives.
- `@mailmypdf/design-system/vertical-landing.css` — canonical shared CSS entry point for vertical apps.

The public, authenticated, and admin surfaces share tokens and patterns but are
kept as separate contracts so a change to one product surface does not silently
reshape the others.

## Vertical rule

Do not import `packages/design-system/src/**` from an app. Import the package
entry points above. A vertical landing page should contain vertical-specific
copy and data only; shared layout, typography, spacing, color, hero, trust, and
workspace primitives belong here.
