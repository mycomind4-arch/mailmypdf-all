# Registry Adapters Package

Provider-neutral adapters for authoritative business/entity registries, UCC filing offices, and future public-record sources.

## Implemented foundation

- shared source/query/result/artifact contracts
- normalized adapter error taxonomy
- HTTPS + compliance gates for external sources
- jurisdiction/capability-aware adapter registry
- business-registry adapter contracts and identity-capacity normalizers
- UCC filing-search contracts, name normalization, and explicit search-completeness semantics
- search-strategy planning/execution with labeled variants, required-source coverage, and conclusive-no-hit gates
- workspace tests and Shared Intelligence & Registries CI

## Boundary

Adapters acquire and normalize evidence. They do **not** decide legal identity, ownership, authority, attachment, perfection, or priority.

A registry hit is evidence supplied to the appropriate reasoning engine. A no-hit result is not proof of absence unless the source explicitly represents the search as complete and reports no provider limitations.

Concrete provider adapters belong under the relevant provider directories only after the official source, access method, terms/robots posture, rate limits, and response semantics have been verified.
