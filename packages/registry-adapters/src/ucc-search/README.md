# UCC Search Adapters

## Purpose

Queries supported UCC filing sources and normalizes filing/search records for pre-filing and priority analysis.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `adapter.ts` | Provider-neutral UccSearchAdapter interface. |
| `normalizer.ts` | Normalizes debtor names, secured-party names, filing numbers, dates, status, collateral text, and source provenance. |
| `search-strategy.ts` | Supports controlled search variants without declaring them authoritative filing names. |
| `registry.ts` | Adapter registry by jurisdiction/provider. |
| `providers/` | Concrete filing-office/search-provider adapters. |
| `types.ts` | UCC query/result types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Search completeness and provider limitations must be represented explicitly. A no-hit result is not automatically proof that no competing interest exists.
