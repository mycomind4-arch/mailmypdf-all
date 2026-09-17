# Jurisdiction Rules Source

## Purpose

Source tree for reusable jurisdiction-specific rule families.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.ts` | Stable public exports. |
| `registry.ts` | Jurisdiction/rule-pack registry with effective dates and coverage. |
| `types.ts` | Rule-pack, authority, effective-date, and result types. |
| `ucc/` | UCC secured-transaction jurisdiction rule packs. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
