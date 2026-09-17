# Perfection Execution Authority

## Purpose

Maps Perfection Execution rules and findings to authoritative sources and records jurisdiction coverage.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `authorities.json` | Primary statutes, regulations, official instructions, filing-office guidance, and source metadata. |
| `rule-authority-map.ts` | Links deterministic rule IDs to authority IDs and effective dates. |
| `jurisdiction-coverage.json` | Documents which jurisdictions/rule versions are currently supported. |
| `verification-notes.md` | Research notes for unresolved or conditional propositions; not executable law. |
| `source-checksums.json` | Optional integrity/version metadata for locally retained source materials. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Disputed research may inform verification work, but production rules should not cite or rely on a proposition until the controlling or otherwise appropriate authority has been identified.
