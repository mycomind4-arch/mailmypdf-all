# Jurisdiction Rule Tests

## Purpose

Proves jurisdiction data is versioned, internally consistent, and explicit about unsupported coverage.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `fixtures/` | Synthetic debtor/jurisdiction/rule-version cases. |
| `registry.test.ts` | Registry uniqueness, effective dates, and coverage. |
| `debtor-name.test.ts` | Debtor-name rule cases. |
| `filing-location.test.ts` | Filing-jurisdiction cases. |
| `perfection.test.ts` | Jurisdiction-specific perfection cases. |
| `priority.test.ts` | Jurisdiction-specific priority cases. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
