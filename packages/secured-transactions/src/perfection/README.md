# Perfection Engine

## Purpose

Reusable perfection logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `method-selector.ts` | Determines supported perfection methods by collateral and facts. |
| `perfection-plan.ts` | Creates required actions and dependencies. |
| `perfection-event.ts` | Canonical record of an attempted/completed perfection act. |
| `perfection-validator.ts` | Verifies evidence against the approved perfection plan. |
| `types.ts` | Perfection types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
