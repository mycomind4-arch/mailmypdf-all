# Governing Law Engine

## Purpose

Reusable governing law logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `debtor-location.ts` | Resolves debtor-location inputs using entity/capacity findings and jurisdiction data. |
| `governing-law-engine.ts` | Determines applicable law for perfection/priority questions. |
| `filing-office-resolver.ts` | Returns the applicable filing office/rule set when supported. |
| `types.ts` | Governing-law result types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
