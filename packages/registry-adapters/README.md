# Registry Adapters Package

## Purpose

Provider-neutral adapters for authoritative business/entity registries and UCC search sources. Raw external data should be normalized with provenance before workflow use.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `package.json` | Workspace metadata and adapter dependencies. |
| `tsconfig.json` | TypeScript configuration. |
| `src/` | Provider interfaces, normalizers, and concrete adapters. |
| `tests/` | Contract, fixture, and integration tests. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
