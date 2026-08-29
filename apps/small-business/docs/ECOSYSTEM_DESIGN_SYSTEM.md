# Small Business — Ecosystem Design System

Small Business is a member of the MailMyPDF product family and must consume the shared visual contract from `@mailmypdf/design-system`.

## Shared

Use the ecosystem typography, spacing, radius, neutral surfaces, status semantics, focus treatment, responsive layout and workflow/approval patterns.

## Small Business theme

Use the Small Business teal accent only for brand emphasis and primary actions. Do not create a separate component vocabulary or spacing scale.

## Domain-specific UI

Business-specific cards and workflows are welcome: invoices, CRM contacts, vendor/customer records, contract renewal, payment demand, and compliance tasks. Their underlying visual primitives should remain ecosystem-consistent.

## Required states

Every consequential workflow must expose the shared states: Ready, Review, Approval Required, Blocked, Sent, Tracking, and Proof Available.

## Accessibility

Target WCAG 2.2 AA, preserve visible keyboard focus, never encode meaning through color alone, and support reduced motion.
