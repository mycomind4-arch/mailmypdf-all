# Section Test Plan

## Purpose

Cross-workflow tests that prove the vertical works as a coherent system.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `acceptance/` | End-to-end workflow acceptance rules. |
| `fixtures/` | Shared synthetic parties, obligations, collateral, filings, and competing-interest data. |
| `integration/` | Tests of interactions among identity-capacity, secured-transactions, jurisdiction rules, registry adapters, runtime, and packet generation. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
