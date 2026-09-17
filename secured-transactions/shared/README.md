# Vertical Shared Layer

## Purpose

Contains code reused by multiple workflows in this section but not general enough to belong in a platform package.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `components/` | Secured-transactions-specific composed UI. |
| `config/` | Section registries and feature configuration. |
| `domain/` | Thin vertical vocabulary/catalog definitions; substantive reusable engines belong in packages. |
| `navigation/` | Public/authenticated navigation declarations for this section. |
| `seo/` | Section-wide SEO helpers and structured-data defaults. |
| `index.ts` | Barrel export for intentionally shared vertical code. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
