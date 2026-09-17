# Registry Adapter Source

## Purpose

Source tree for external-registry adapters used by identity/capacity and secured-transaction workflows.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.ts` | Stable public exports. |
| `types.ts` | Shared query, result, provenance, error, and capability types. |
| `errors.ts` | Normalized adapter error taxonomy. |
| `business-registries/` | Secretary-of-State/business registry adapters. |
| `ucc-search/` | UCC filing search adapters. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
