# Filing Engine

## Purpose

Reusable filing logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `ucc1-builder.ts` | Builds a financing-statement data model from verified inputs. |
| `authorization-gate.ts` | Requires a supported authorization basis before filing-oriented outputs can proceed. |
| `debtor-name-check.ts` | Consumes authoritative-name and jurisdiction rules for filing-name validation. |
| `filing-verification.ts` | Normalizes filing receipts/status and detects defects. |
| `types.ts` | Filing types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
