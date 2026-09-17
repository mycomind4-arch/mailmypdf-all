# Secured Transactions Package Tests

## Purpose

Tests shared engines independently of any single UI workflow.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `fixtures/` | Canonical synthetic domain cases. |
| `integration/` | Cross-engine and cross-package integration tests. |
| `eligibility.test.ts` | Eligibility engine unit tests. |
| `attachment.test.ts` | Attachment analysis tests. |
| `perfection.test.ts` | Perfection method/event tests. |
| `priority.test.ts` | Priority engine tests. |
| `lifecycle.test.ts` | Continuation/amendment/assignment/termination tests. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
