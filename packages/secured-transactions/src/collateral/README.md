# Collateral Engine

## Purpose

Reusable collateral logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `collateral-classifier.ts` | Classifies collateral from verified facts. |
| `rights-input.ts` | Consumes ownership/rights findings from identity-capacity. |
| `description-builder.ts` | Builds candidate collateral descriptions without overstating scope. |
| `types.ts` | Collateral and classification types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
