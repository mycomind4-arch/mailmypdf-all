# UCC Priority Rules

## Purpose

Versioned jurisdiction-specific priority rules for UCC workflows.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `rules.ts` | Jurisdiction-specific priority rules and supported variations. |
| `authority-map.json` | Authority and effective-date mapping. |
| `types.ts` | Priority-rule types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Rule data must record jurisdiction, source authority, effective date/version, and coverage status. Unsupported jurisdictions should return an explicit unsupported/unresolved result rather than a guessed rule.
