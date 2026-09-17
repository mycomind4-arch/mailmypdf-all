# Secured Transactions Source

## Purpose

Public source tree for shared secured-transaction engines.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.ts` | Stable public exports. |
| `types.ts` | Cross-engine transaction, collateral, perfection, priority, and finding types. |
| `reason-codes.ts` | Stable machine-readable reasons used in findings. |
| `eligibility/` | Transaction qualification engine. |
| `obligations/` | Obligation/value modeling and validation. |
| `collateral/` | Collateral classification, ownership input, and description support. |
| `governing-law/` | Debtor-location and governing-law resolution. |
| `perfection/` | Perfection method selection and verification. |
| `priority/` | Priority analysis. |
| `filing/` | Financing-statement preparation/verification support. |
| `lifecycle/` | Continuation, amendment, assignment, termination, and maintenance. |
| `findings/` | Typed findings and explanations. |
| `certification/` | Attachment/perfection/priority assessment and review gates. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
