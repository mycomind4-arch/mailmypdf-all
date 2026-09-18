# Identity & Capacity — DRAFT

Status: DRAFT / UNTESTED / NOT PRODUCTION INTEGRATED

This package contains reusable identity, entity, name, capacity,
ownership, and transaction-party intelligence intended for use across
MailMyPDF and Studio workflows.

## Important

These files were designed before repository-level integration testing.

They must not be treated as production-ready until:

- imports are reconciled with the current monorepo
- shared provenance/facts/entity abstractions are inspected
- duplicate functionality is removed
- TypeScript typecheck passes
- unit tests pass
- security review passes
- workflow acceptance tests pass

## Design invariants

1. Capitalization alone does not create a separate legal person.
2. Name normalization does not establish legal identity.
3. Search variants are not authoritative filing names.
4. Entity classification must be evidence-driven.
5. A title such as "Manager" or "Trustee" does not itself establish authority.
6. Capacity and authority-to-act are separate questions.
7. AI may extract candidate facts but must not silently create legal relationships.
8. Consequential findings must retain provenance.
9. Conflicting evidence must remain visible.
10. Missing evidence must block consequential downstream actions rather than being guessed.

## Planned modules

- name normalization
- search variant generation
- name comparison
- source authority
- authoritative name resolution
- jurisdiction-specific name rules
- entity classification
- capacity resolution
- capacity graph
- authority-to-act
- ownership resolution
- debtor / obligor resolution
- obligation and value
- collateral classification
- secured transaction attachment
- perfection
- priority
- maintenance / continuation
