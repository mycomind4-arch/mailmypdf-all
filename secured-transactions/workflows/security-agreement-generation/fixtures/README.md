# Security Agreement Generation Fixtures

## Purpose

Synthetic cases for Studio simulation and automated testing of Security Agreement Generation.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `happy-path.json` | Complete scenario expected to pass all gates. |
| `missing-required-fact.json` | Scenario proving the workflow halts rather than inventing a missing fact. |
| `contradictory-evidence.json` | Scenario proving conflicts remain explicit. |
| `edge-cases.json` | Less common but supported factual patterns. |
| `expected-findings.json` | Expected typed findings/reason codes for canonical fixtures. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
