# Name & Capacity Resolution — Workflow Standard

Updated: 2026-09-17

## Purpose

Resolve parties, authoritative names, entity types, roles, representative capacities, ownership relationships, obligation relationships, and authority to act from evidence.

## Required behavior

- Capitalization and punctuation differences are normalization issues, not proof of separate legal persons.
- Search variants are discovery aids and must remain separate from authoritative-name findings.
- AI may extract candidate facts but must not silently choose a controlling name, entity, ownership result, or capacity.
- Material findings must retain source provenance.
- Conflicting or insufficient evidence remains unresolved and requires review.
- Reuse the existing `@mailmypdf/identity-capacity` engines rather than duplicating them here.

## Current maturity

Scaffolded and non-executable. This workflow currently establishes the route, manifest, design-system shell, intelligence bindings, and review boundary. Workflow-specific tests and UI for reviewing the engine outputs are the next implementation layer.
