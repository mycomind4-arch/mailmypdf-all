# Registry Adapter Fixtures

## Purpose

Sanitized or synthetic external-registry responses used for deterministic tests.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `business-registry/` | Representative organization-search responses. |
| `ucc-search/` | Representative filing/search responses. |
| `errors/` | Rate-limit, unavailable, ambiguous, malformed, and unsupported-provider cases. |
| `expected-normalized/` | Expected provider-neutral records for each fixture. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
