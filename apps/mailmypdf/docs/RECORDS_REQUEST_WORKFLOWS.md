# Records Request Workflow Family

RecordsRequest is a first-class MailMyPDF product with 15 distinct workflow modes. Each workflow shares the same customer pipeline:

`Select workflow → collect request facts → analyze → draft → validate → readiness → human review → MailMyPDF checkout → mail → tracking/proof`

## Workflow catalog

| ID | Workflow | Category | Primary scope |
|---|---|---|---|
| `federal-foia` | Federal FOIA Request | Federal | Federal executive-agency records |
| `state-public-records` | State Public Records Request | State | State-government records |
| `local-government-records` | Local Government Records Request | Local | City/county/district records |
| `police-incident-records` | Police Incident Records | Public safety | Incident reports and supplements |
| `body-camera-records` | Body Camera / Video Records | Public safety | Body/dash/surveillance video |
| `911-dispatch-records` | 911 / Dispatch Records | Public safety | 911 audio, CAD, dispatch logs |
| `public-employee-records` | Public Employee Records | State | Personnel/disciplinary/public employment records |
| `procurement-contract-records` | Procurement & Contract Records | State | Bids, contracts, awards, invoices |
| `permits-licenses-records` | Permits, Licenses & Inspections | Local | Permits, inspections, code enforcement, licenses |
| `property-assessment-records` | Property & Assessment Records | Property | Assessments, parcels, appraisal records |
| `education-school-records` | Education & School Records | Education | Public education administrative records |
| `environmental-records` | Environmental & Regulatory Records | Environment | Permits, inspections, monitoring, enforcement |
| `election-records` | Election & Campaign Records | Elections | Campaign filings and election administration |
| `immigration-foia-pa` | Immigration FOIA / Privacy Act Records | Immigration | Immigration agency records and case files |
| `court-public-access` | Court & Judicial Public Access Request | Courts | Court/judicial public-access records |

## Safety boundaries

The workflow registry is operational guidance, not a database of laws. The AI provider must not invent statutes, custodians, deadlines, exemptions, privacy rules, or procedural rights. Jurisdiction-specific claims should remain explicitly uncertain until verified.

Court/judicial requests are intentionally distinguished from FOIA/public-records requests. Student, personnel, law-enforcement, privacy-sensitive, and investigative records receive explicit review warnings.

## API surface

- `GET /api/v1/records-request/workflows`
- `POST /api/v1/records-request/analyze`
- `POST /api/v1/records-request/draft`
- `POST /api/v1/records-request/validate`
- `POST /api/v1/records-request/readiness`
- Customer UI: `/records-request`

`workflowId` is accepted by the API and may be omitted by legacy clients; when omitted, the server resolves the workflow from `requestType`. This preserves the existing Records Request UI contract while making the workflow registry authoritative.
