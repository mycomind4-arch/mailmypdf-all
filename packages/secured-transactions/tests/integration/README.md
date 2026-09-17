# Package Integration Tests

## Purpose

Verifies secured-transactions engines with identity-capacity and jurisdiction rule inputs.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `identity-capacity.test.ts` | Party/name/ownership/authority findings feed transaction engines correctly. |
| `jurisdiction-rules.test.ts` | Jurisdiction datasets control filing/perfection decisions. |
| `registry-results.test.ts` | Normalized search results flow into competing-interest analysis. |
| `certification.test.ts` | Findings, provenance, and review gates survive full engine composition. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
