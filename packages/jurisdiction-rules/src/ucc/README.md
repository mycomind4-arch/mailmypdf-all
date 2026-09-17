# UCC Rule Packs

## Purpose

Groups UCC rule families used by secured-transaction engines.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.ts` | UCC rule exports and registry. |
| `debtor-name/` | Jurisdiction-specific debtor-name rules. |
| `filing-location/` | Debtor location and filing-office rules. |
| `perfection/` | Perfection-method jurisdiction rules. |
| `priority/` | Priority rules requiring jurisdiction-specific data. |
| `exceptions/` | Supported exceptions and special cases. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
