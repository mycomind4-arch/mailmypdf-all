# Code Enforcement Records — Flagship Workflow

## Contract

`code-enforcement-records` is the reference Records Requests workflow. It uses the platform lifecycle and adds code-enforcement-specific request and production intelligence.

## Intake

Required or strongly preferred identifiers:

- agency
- department/custodian
- property address
- parcel/APN
- case number
- violation/citation number
- related party
- date range
- subject matter

The workflow should never require every identifier. It should explain which identifier is missing and why that may reduce search precision.

## Request categories

The flagship request should support complaints, inspections, photographs/media, notices of violation, correction notices, citations, administrative orders, abatement records, permits, and correspondence. Categories should remain extensible without changing the workflow engine.

## Production analysis

The production analyzer compares the requested categories against the records actually located. Findings use cautious evidence language: absence from the production is not proof that a record does not exist.

Initial finding types:

- `MISSING_REQUESTED_CATEGORY`
- `REFERENCED_RECORD_NOT_PRODUCED`
- `IDENTIFIER_MISMATCH`
- `DATE_GAP`
- `DUPLICATE_RECORD`
- `MISSING_ATTACHMENT`
- `UNEXPLAINED_REDACTION`
- `PARTIAL_PRODUCTION`
- `UNRESPONSIVE_ITEM`
- `PRODUCTION_AMBIGUITY`

## Safety / epistemic rules

The workflow must distinguish facts, inferences, unknowns, rules, and recommendations. It must not conclude that records do not exist merely because they were not produced. Jurisdictional conclusions require a versioned policy source.

## Next production milestones

1. Connect the analyzer to uploaded production records.
2. Add entity/date/case-number extraction using platform intelligence.
3. Add timeline and contradiction analysis.
4. Add evidence-linked findings.
5. Generate follow-up strategies from findings.
6. Integrate findings into the request case lifecycle.
7. Add end-to-end tests covering request → approval → mailing → production → analysis → follow-up.
