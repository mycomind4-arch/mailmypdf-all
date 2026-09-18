# Governing Law & Filing Jurisdiction — Workflow Standard

Updated: 2026-09-17

## Purpose

Resolve supported debtor-location facts, governing-law questions, and filing-jurisdiction issues without guessing unsupported rules.

## Planned primary output

Jurisdiction finding, filing-office finding, governing-law basis, and unresolved-rule flags.

## Current maturity

This workflow is scaffolded and non-executable. It must not perform a filing, payment, mailing, or other consequential action until its workflow-specific deterministic rules, authority coverage, fixtures, tests, and review UI are complete.

## Implementation boundaries

- Preserve source provenance for material facts and findings.
- Reuse shared identity/capacity, secured-transaction, jurisdiction-rule, registry-adapter, intelligence, workflow, document, and proof packages.
- Keep search variants separate from authoritative names.
- Keep incomplete or contradictory evidence explicit.
- Require human review for consequential findings and outputs.
- Do not manufacture an obligation, authorization, collateral right, filing basis, priority position, or jurisdiction conclusion that the supported evidence and rules do not establish.
