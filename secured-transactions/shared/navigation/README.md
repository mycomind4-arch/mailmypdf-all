# Section Navigation

## Purpose

Declares how the section appears in MailMyPDF public navigation and authenticated workspace navigation.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `public-navigation.ts` | Public section/workflow links and ordering. |
| `authenticated-navigation.ts` | Matter-centric links for signed-in users without marketing content. |
| `breadcrumbs.ts` | Canonical breadcrumb construction for section and workflow routes. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
