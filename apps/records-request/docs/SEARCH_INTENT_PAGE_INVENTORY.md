# Records Requests — Search-Intent Page & Workflow Inventory

## Architecture
Records Requests is the master vertical for obtaining, tracking, reviewing, and escalating public/government records. One master directory should route users by the record they need or the job they need to accomplish.

## Tier 1 — Directory
- `/` — Public Records Requests master directory
- `/police-records/`
- `/court-records/`
- `/property-records/`
- `/permit-records/`
- `/government-records/`
- `/vital-records/`
- `/military-records/`
- `/foia-records/`

## Tier 2 — High-priority intent pages
- `/request-public-records/` — public records request
- `/request-police-report/` — request police report / copy of police report
- `/police-records-request/` — police records request
- `/request-court-records/` — court records
- `/open-records-request/` — open records request
- `/foia-request/` — FOIA request / how to file a FOIA request
- `/public-information-request/` — public information request
- `/military-records-request/` — military records request
- `/birth-records-request/` — birth records request
- `/marriage-records-request/` — marriage records request
- `/divorce-records-request/` — divorce records request
- `/property-records-request/` — property records
- `/permit-records-request/` — permit records

## Tier 3 — Workflow pages
Each workflow page should support: request builder, agency identification, scope drafting, submission, deadline/status tracking, follow-up, production review, deficiency detection, escalation, and optional certified mail/proof handoff.

### Police
- Request incident report
- Request police report copy
- Request 911/call records
- Request body-camera records
- Request dispatch/CAD records
- Request arrest records

### Courts
- Request civil court records
- Request criminal court records
- Request small-claims records
- Request docket/case file

### Property / local government
- Request property records
- Request code-enforcement records
- Request permit records
- Request inspection records
- Request planning/zoning records

### Vital / personal records
- Request birth certificate/record
- Request marriage record
- Request divorce record
- Request death record

### Federal / administrative
- File FOIA request
- Follow up on unanswered FOIA request
- Challenge an incomplete production
- Challenge an improper withholding
- Track records production

## SEO rules
Informational high-volume terms should explain the process and link into an action workflow. Do not create duplicate pages for close synonyms. One canonical page should own each intent cluster.

## Conversion path
Search → intent page → request builder → submission → tracking → production review → escalation → MailMyPDF proof/delivery when needed.
