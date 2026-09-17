# Jurisdiction Rules Package

## Purpose

Versioned deterministic jurisdiction datasets and rule evaluators. It should answer supported jurisdiction-specific questions without hiding effective dates or coverage gaps.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `package.json` | Workspace metadata and exports. |
| `tsconfig.json` | TypeScript configuration. |
| `src/` | Jurisdiction rule source and registries. |
| `tests/` | Rule/version/coverage tests. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
