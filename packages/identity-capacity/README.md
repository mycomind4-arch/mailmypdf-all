# @mailmypdf/identity-capacity

Reusable, provenance-first engines for identity, capacity, authority, ownership, obligations, and party roles.

## Current engines

- deterministic name normalization and comparison
- purpose-specific source authority evaluation
- authoritative-name resolution
- entity classification
- capacity resolution
- authority-to-act resolution
- ownership and rights resolution
- obligation reconstruction
- party-role resolution
- jurisdiction resolution driven by explicit purpose-specific policy

## Design boundaries

These engines resolve what supported evidence establishes for a specific purpose. They preserve uncertainty, conflicts, provenance, and human-review gates.

They do not treat capitalization, aliases, role labels, possession, invoices, filings, or AI inference as automatic proof of legal identity, ownership, enforceability, authority, or priority.

The package CI builds workspace dependencies before executing the runtime test suite.

Shared dependency build errors are repaired before runtime verification.

Purpose-specific legal/domain policies are registered in the shared `@mailmypdf/intelligence/authority` registry so engines can remain generic and deterministic.

## Certification

The package includes name and capacity evidence-readiness certification. Certification is purpose-specific and policy-driven: it checks authoritative-name confidence, entity classification, supported capacities, jurisdiction requirements, and optional registry/search coverage.

A successful certification means the shared evidence gates are satisfied for the stated workflow purpose. It is not a judicial, governmental, or filing-office determination of legal identity, authority, ownership, attachment, perfection, or priority.
