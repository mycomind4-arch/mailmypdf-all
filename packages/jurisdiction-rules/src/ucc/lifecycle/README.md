# UCC Lifecycle Rules

## Purpose

Holds the versioned rule contract for later financing-statement lifecycle actions such as amendment, continuation, assignment, and termination. This directory does not contain assumed nationwide defaults; executable rule packs must identify jurisdiction, authority, effective dates, and required fields.

## Planned and current files

| File | Function |
| --- | --- |
| `rule-contract.ts` | Defines the lifecycle action/rule-data contract and resolves it through the shared jurisdiction-rule registry. |
| `index.ts` | Public exports for lifecycle rule types and resolver. |
| `authority-map.json` | Future rule-to-authority mapping when real jurisdiction packs are added. |
| `states/` | Future jurisdiction/version data only where authoritative rule coverage has been researched and verified. |

## Boundary

Unsupported jurisdictions or dates must return an explicit unsupported result. No workflow may calculate or act on a lifecycle deadline merely because this directory exists; deadline/action behavior requires a real active authority-backed rule pack plus review.
