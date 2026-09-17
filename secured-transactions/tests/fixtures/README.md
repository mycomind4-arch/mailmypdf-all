# Shared Section Fixtures

## Purpose

Synthetic, non-user data reused across workflow tests.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `individual-debtor.json` | Baseline individual-debtor scenario. |
| `registered-organization.json` | Baseline registered-organization scenario. |
| `mixed-collateral.json` | Representative collateral classes. |
| `competing-filings.json` | Synthetic competing UCC records for priority tests. |
| `contradictory-evidence.json` | Evidence conflicts used to verify uncertainty and review gates. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
