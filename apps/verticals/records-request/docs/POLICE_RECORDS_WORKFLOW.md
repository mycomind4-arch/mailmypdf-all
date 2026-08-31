# Police Records Request — Workflow Contract

## Scope

`police-records` is the second flagship Records Requests workflow. It is designed around incident-centered public-records research, not a generic police-report letter template.

## Intake identifiers

The workflow accepts agency/custodian, incident and arrest identifiers, date range, location, people, vehicle identifiers, and plain-English subject matter. An incident/report number, location, or person identifier is expected before a request can be treated as sufficiently searchable.

## Record categories

The workflow covers incident reports, arrest/booking records, CAD/dispatch, body-camera, dash-camera, 911 calls, photographs/video, witness/victim statements, supplemental reports, and correspondence/case notes.

## Production analysis

Production review detects:

- missing requested categories;
- partial production;
- referenced records that appear not to have been separately produced;
- incident/report identifier mismatches;
- duplicate files by SHA-256;
- missing media when media categories were requested;
- redaction/withholding language.

The analyzer deliberately uses review language. Missing or unmatched records are findings about the production, not proof that an underlying record does not exist. The workflow does not make legal conclusions about exemptions, disclosure duties, or redaction validity.

## Multi-LLM layer

Consequential analytical tasks are provider-agnostic and can require a multi-provider quorum for classification, fact extraction, contradiction assessment, and follow-up strategy. Provider disagreement is surfaced rather than silently collapsed into certainty. Deterministic identifiers, hashes, fulfillment state, and policy versions are never delegated to an LLM.

## Commercial UX / SEO

The landing page targets the search cluster around police records requests, police reports, CAD/dispatch records, body-camera, dash-camera, 911 calls, arrest records, and records by incident/date/address. The page explains what the workflow can request, why identifiers improve searchability, and what happens after production.

## Next platform integration

When MailMyPDF Platform packages are externally consumable, replace the compatibility boundary with the published intelligence/workflow/proof/fulfillment packages without changing the Police Records domain API.
