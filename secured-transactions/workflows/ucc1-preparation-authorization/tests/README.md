# UCC-1 Preparation & Authorization Tests

## Purpose

Workflow-local tests for UCC-1 Preparation & Authorization.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `manifest.test.ts` | Manifest structure, dependencies, step order, and required gates. |
| `rules.test.ts` | Deterministic rule behavior against canonical fixtures. |
| `intelligence.test.ts` | Fact/evidence bindings and uncertainty handling. |
| `runtime-policy.test.ts` | Blocked/allowed transitions and human-review requirements. |
| `forms.test.ts` | Form/template selection and field-map completeness where applicable. |
| `acceptance.test.ts` | End-to-end fixture run to expected findings and outputs. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
