# Shared Secured Transactions Package

## Purpose

Reusable domain engines for legitimate secured transactions. Workflows should call these engines rather than reimplementing Article 9 concepts.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `package.json` | Workspace metadata, exports, dependencies, and scripts. |
| `tsconfig.json` | Package TypeScript configuration. |
| `src/` | Reusable domain engines and types. |
| `tests/` | Package-level unit, fixture, and integration tests. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
