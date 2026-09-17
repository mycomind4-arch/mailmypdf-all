# Priority Engine

## Purpose

Reusable priority logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `priority-engine.ts` | Applies supported priority rules to verified interests and facts. |
| `competing-interest.ts` | Normalizes competing claims into comparable records. |
| `exception-rules.ts` | Handles supported statutory/special priority exceptions. |
| `priority-matrix.ts` | Produces explainable pairwise/ordered analysis without hiding uncertainty. |
| `types.ts` | Priority input/output types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
