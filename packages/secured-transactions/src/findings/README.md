# Findings Engine

## Purpose

Reusable findings logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `finding-types.ts` | Typed secured-transaction finding taxonomy. |
| `finding-builder.ts` | Creates evidence-linked findings. |
| `reason-codes.ts` | Stable domain-specific reason codes. |
| `explanations.ts` | User-facing explanations derived from deterministic results. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
