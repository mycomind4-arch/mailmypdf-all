# UCC Debtor Name Rules

## Purpose

Versioned jurisdiction-specific debtor name rules for UCC workflows.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `rules.ts` | Evaluates the controlling debtor-name rule for supported debtor/entity types. |
| `states/` | Per-state rule data or adapters where deviations/versioning require it. |
| `authority-map.json` | Rule IDs mapped to statutes/official instructions and effective dates. |
| `types.ts` | Debtor-name rule types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Rule data must record jurisdiction, source authority, effective date/version, and coverage status. Unsupported jurisdictions should return an explicit unsupported/unresolved result rather than a guessed rule.
