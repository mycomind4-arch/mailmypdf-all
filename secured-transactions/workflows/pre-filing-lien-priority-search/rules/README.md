# Pre-Filing Lien & Priority Search Rules

## Purpose

Contains deterministic rules unique to Pre-Filing Lien & Priority Search. Shared Article 9 engines and jurisdiction rules must be imported rather than copied.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `eligibility.ts` | Workflow-specific entry and disqualification conditions. |
| `validation.ts` | Cross-field validation and required-evidence rules. |
| `gates.ts` | Conditions that block consequential progression until satisfied. |
| `findings.ts` | Maps rule results into typed findings/reason codes. |
| `constants.ts` | Workflow-local enumerations or thresholds that are not jurisdiction datasets. |
| `index.ts` | Explicit exports for workflow-specific rules. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
