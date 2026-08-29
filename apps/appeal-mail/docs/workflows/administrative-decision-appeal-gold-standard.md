# Administrative Decision Appeal — Supreme Authority Gold Standard

## Workflow identity
- Workflow ID: `administrative-decision-appeal`
- User-facing title: **Appeal an Administrative Decision**

## Authority-first promise
This workflow does not assume a universal administrative appeal process. Filing deadlines, agency-specific appeal levels, exhaustion, forms, recipients, service methods, hearing rights, stays, and judicial-review paths must be supported by the decision notice or an authoritative source identified for the applicable agency and jurisdiction. Unsupported conclusions remain unresolved.

## Landing-page authority content
The public workflow page must explain that the system:
- analyzes the actual administrative decision and separates findings from disputed facts;
- verifies procedural claims against official agency, court, statute, regulation, or rule sources;
- distinguishes extracted dates from verified filing deadlines;
- identifies the apparent appeal/review path without assuming one;
- maps evidence gaps and contradictions before drafting;
- independently stress-tests the response;
- requires explicit human approval before mailing;
- produces the final response PDF and retains provider-backed mailing proof through MailMyPDF.

## Executable pipeline
`upload → classify → extract → authority-resolve → deadline-check → appeal-path-check → evidence-gap analysis → contradiction detection → timeline/x-ray → adversarial stress test → response strategy → draft → independent validation → readiness gate → human approval → deterministic PDF → Stripe checkout → MailMyPDF upload → communication/provider submission → status → proof`

## Authority record
Each procedural finding should carry: `claim`, `sourceType`, `sourceUrl`, `sourceTitle`, `jurisdiction`, `effectiveDate`, `retrievedAt`, `confidence`, `verificationState`, and `notes`.

Verification states: `verified`, `partially_verified`, `unverified`, `conflicting`.

## Safety boundaries
- Never infer a deadline from a generic administrative-appeal convention.
- Never turn a decision date into a filing deadline without source support.
- Never assume exhaustion or a required internal appeal.
- Never invent an agency address, form, filing portal, tribunal, or recipient.
- Never present a judicial-review deadline as an administrative-appeal deadline.
- Never convert unsupported user assertions into established facts.

## Readiness gate
Payment is blocked until the decision is identified, agency/jurisdiction gaps are surfaced, procedural claims are supported or unresolved, material evidence gaps and contradictions are visible, strategy is coherent, validation passes, recipient data is complete, and the user explicitly approves the final response.

## SEO intent
Primary: `administrative decision appeal`
Secondary: `appeal administrative decision`, `administrative appeal process`, `challenge administrative decision`, `appeal government decision`, `administrative review`, `administrative agency appeal`.

SEO language must explain the uncertainty of agency-specific processes rather than imply that one universal procedure exists.
