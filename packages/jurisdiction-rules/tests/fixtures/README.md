# Jurisdiction Fixtures

## Purpose

Synthetic inputs for jurisdiction-rule tests.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `individuals.json` | Individual debtor-location/name scenarios. |
| `organizations.json` | Registered-organization scenarios. |
| `trusts-estates.json` | Representative trust/estate capacity scenarios when supported. |
| `effective-date-cases.json` | Cases around rule-version transitions. |
| `unsupported.json` | Cases that must return unsupported/unresolved rather than inferred rules. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
