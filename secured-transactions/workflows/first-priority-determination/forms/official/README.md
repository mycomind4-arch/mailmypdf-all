# First-Priority Determination Official Forms

## Purpose

Stores authoritative blank forms for First-Priority Determination only when a real issuing/filing authority provides them.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `<authority>-<form-id>.pdf` | Source form preserved as obtained, subject to version tracking. |
| `sources.json` | Source URL/authority, retrieval date, form revision, checksum, and jurisdiction metadata. |
| `version-policy.ts` | Optional rules that prevent use of superseded official forms. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Do not place MailMyPDF-created substitutes here; generated or templated documents belong in sibling directories.
