# Code Enforcement Records — Flagship Workflow

## Workflow objective

Turn a plain-English property or enforcement objective into a precise, searchable records request and preserve the resulting matter for production review.

## Intake dimensions

- agency / records custodian
- likely department
- property address
- parcel / APN
- case number
- violation / citation number
- related person or entity
- date range
- subject matter

## Record categories

1. Case file and routing history
2. Complaints and service requests
3. Inspections and inspection reports
4. Photographs and video
5. Notices, citations and orders
6. Correspondence and enforcement communications
7. Enforcement actions
8. Abatement and compliance
9. Permits and related records
10. Referenced or attached records

## Response-analysis goals

The workflow should compare the production against the approved request and identify, with evidence links where available:

- missing requested category
- partial production
- referenced-but-not-produced record
- date gap
- duplicate record
- missing attachment
- case identifier mismatch
- property identifier mismatch
- unexplained withholding/redaction language
- unresponsive request item
- production ambiguity

## Separation of concerns

The workflow owns the domain intelligence above. Generic lifecycle, authorization, document integrity, audit, proof, fulfillment and reusable intelligence belong to the MailMyPDF platform contracts.

## Build sequence

1. Complete intake and category selection UX.
2. Add workflow-specific validation and scope preview.
3. Add request review/edit before persistence.
4. Connect the resulting request to the generic lifecycle.
5. Add evidence-backed production ingestion and findings.
6. Add follow-up/response strategy primitives.
7. Add jurisdiction packs only from verified, versioned legal sources.
