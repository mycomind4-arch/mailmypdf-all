# Priority Preservation & Monitoring Forms

## Purpose

Coordinates forms and document templates unique to Priority Preservation & Monitoring.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `official/` | Authoritative blank forms obtained from the issuing/filing authority. |
| `generated/` | MailMyPDF-generated form layouts or generated document resources. |
| `templates/` | Reusable document templates that are not official government forms. |
| `form-registry.ts` | Typed registry of form IDs, versions, sources, and required conditions. |
| `field-map.ts` | Maps verified workflow facts to form/template fields. |
| `document-requirements.ts` | Rules describing when each document is required or prohibited. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
