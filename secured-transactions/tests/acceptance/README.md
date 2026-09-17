# Section Acceptance Tests

## Purpose

Tests non-negotiable behavior across all secured-transaction workflows.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `workflow-registry.acceptance.test.ts` | Every registered workflow resolves, renders, and exposes required metadata. |
| `validity-gates.acceptance.test.ts` | Consequential paths cannot bypass obligation, rights-in-collateral, authorization, name, and jurisdiction gates. |
| `provenance.acceptance.test.ts` | Material conclusions retain evidence/provenance. |
| `human-review.acceptance.test.ts` | Unresolved consequential findings cannot be silently auto-approved. |
| `packet.acceptance.test.ts` | Final outputs can be assembled through the shared packet builder where applicable. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
