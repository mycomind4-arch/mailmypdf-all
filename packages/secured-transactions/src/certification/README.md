# Certification Engine

## Purpose

Reusable certification logic for the secured-transaction workflow family.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `attachment-certifier.ts` | Evaluates attachment elements from verified facts and evidence. |
| `perfection-certifier.ts` | Evaluates whether supported perfection evidence satisfies the selected method. |
| `priority-assessment.ts` | Packages priority analysis into an evidence-linked assessment. |
| `human-review-gate.ts` | Escalates consequential uncertainty and conflicts. |
| `types.ts` | Certification/assessment types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
