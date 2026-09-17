# Obligations Engine

## Purpose

Reusable obligations logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `obligation-model.ts` | Canonical representation of the secured obligation and obligor. |
| `value-analysis.ts` | Represents and evaluates evidence of value. |
| `obligation-validation.ts` | Detects missing or contradictory obligation facts. |
| `types.ts` | Obligation/value types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
