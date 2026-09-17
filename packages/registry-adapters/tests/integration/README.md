# Registry Adapter Integration Tests

## Purpose

Optional live/sandbox tests for supported external providers.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `business-registries.integration.test.ts` | Validates configured business-registry adapters against permitted test endpoints. |
| `ucc-search.integration.test.ts` | Validates configured UCC-search adapters against permitted test endpoints. |
| `provenance.integration.test.ts` | Ensures source identity, timestamps, query parameters, and raw-record references survive normalization. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Live integration tests should be opt-in, credential-safe, rate-limit aware, and never required for deterministic unit-test execution.
