# MailMyPDF — Ecosystem Design System

MailMyPDF is the core product and the visual parent of the ecosystem.

## Shared family language

Use the canonical Platform design tokens for typography, spacing, radius, borders, surfaces, shadows, status semantics, focus states and responsive layout.

MailMyPDF may use its own core brand treatment, but ecosystem verticals should still feel like products from the same family.

## Product-specific UI

Mailing checkout, document upload, address verification, pricing, account settings, tracking, proof-of-mailing, and marketing pages remain MailMyPDF-owned experiences.

## Vertical navigation

The ecosystem catalog/discovery surface should link to each vertical's canonical route. Vertical-specific UI should not be forced into `/solutions/*` compatibility routes.

## Accessibility

Target WCAG 2.2 AA, preserve visible keyboard focus, never encode meaning through color alone, and support reduced motion.
