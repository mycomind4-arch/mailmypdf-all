# Section Integration Tests

## Purpose

Verifies that shared packages compose correctly for this vertical.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `identity-capacity.integration.test.ts` | Name, entity, role, ownership, obligation, and authority findings flow into workflows. |
| `jurisdiction.integration.test.ts` | Debtor/entity facts feed jurisdiction and filing-office rules. |
| `registry-adapters.integration.test.ts` | Normalized search/registry results preserve source provenance. |
| `perfection-priority.integration.test.ts` | Perfection events feed priority analysis and verification. |
| `runtime.integration.test.ts` | Workflow manifests, gates, state, review, and outputs compose end-to-end. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
