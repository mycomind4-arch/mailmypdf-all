# Eligibility Engine

## Purpose

Reusable eligibility logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `eligibility-engine.ts` | Determines whether a matter can enter the secured-transaction workflow family. |
| `eligibility-rules.ts` | Deterministic qualification/disqualification rules. |
| `types.ts` | Eligibility inputs, outputs, and reason codes. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
