# Section SEO

## Purpose

Holds vertical-wide metadata helpers while keeping workflow-specific search intent in each workflow's seo.ts.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `section-seo.ts` | Canonical metadata for the section root. |
| `schema.ts` | Structured-data builders for section/workflow directory pages. |
| `workflow-seo-defaults.ts` | Shared defaults that workflow seo.ts files can extend. |
| `canonical.ts` | Canonical URL and indexing rules. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
