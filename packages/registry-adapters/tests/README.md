# Registry Adapter Tests

## Purpose

Contract and integration tests for registry adapters and normalizers.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `fixtures/` | Sanitized/synthetic provider responses. |
| `integration/` | Provider or sandbox integration tests kept separate from deterministic contract tests. |
| `business-registry.contract.test.ts` | All business-registry adapters satisfy the same interface and provenance requirements. |
| `ucc-search.contract.test.ts` | All UCC-search adapters satisfy normalized-result and error semantics. |
| `normalizers.test.ts` | Provider-specific fields normalize without data loss or false certainty. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
