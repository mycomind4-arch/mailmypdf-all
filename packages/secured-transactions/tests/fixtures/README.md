# Package Fixtures

## Purpose

Stable synthetic fixtures for reusable secured-transaction engines.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `transactions.json` | Representative transaction/obligation cases. |
| `collateral.json` | Collateral classification cases. |
| `perfection-events.json` | Filing/control/possession/title-note event examples. |
| `priority-cases.json` | Competing-interest scenarios. |
| `invalid-cases.json` | Cases that must fail validation rather than produce a filing path. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
