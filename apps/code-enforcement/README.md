# Code Enforcement

> A property-centric command center for understanding, managing, and responding to local code-enforcement cases.

Code Enforcement is a My-CoMind vertical built around the evidence-first architecture proven in FairProcess and the property/GIS workflow developed in FairProcessMaps.

## Product goal

Turn a confusing code-enforcement notice into a clear, evidence-backed action plan without requiring the user to understand municipal systems, legal terminology, or scattered public records.

The product should answer five questions immediately:

1. **What is happening?** — case status, alleged violations, deadlines, penalties, and next events.
2. **What evidence supports it?** — notices, inspection reports, photos, permits, ordinances, correspondence, service records, and public-record sources.
3. **What is missing or inconsistent?** — contradictions, missing service proof, unexplained status changes, incomplete records, and timeline anomalies.
4. **What can I do next?** — cure, communicate, request records, request inspection/reinspection, seek hearing/review, appeal, or prepare a response.
5. **What should I send?** — guided, evidence-linked communications and response packets with human approval.

## Reuse from FairProcess / FairProcessMaps

The vertical intentionally reuses concepts rather than creating a parallel civic platform:

- Evidence vault with source, acquisition metadata, page references, hashes, provenance, and human review.
- Property-centric project model: property → case → evidence → events → findings → actions.
- Deterministic timeline and procedural checkpoint engine.
- Versioned jurisdiction policy packs.
- GIS/property intelligence and parcel resolution.
- Due-process discrepancy detection.
- Append-only audit/event history.
- Cloudflare-first deployment using Workers, D1, and R2.

FairProcess describes the underlying evidence-first recordation integrity model and explicitly separates evidence extraction from consequential legal conclusions. FairProcessMaps adds the property/GIS, evidence vault, automatic timeline, and discrepancy-analysis workflow.

## Core UX

### Home / Case Intake

- Paste or upload a notice.
- Enter an address, APN, case number, or citation number.
- AI identifies jurisdiction, agency, case identifiers, alleged violations, dates, deadlines, and requested action.
- User confirms extracted facts before they become case facts.

### Case Command Center

- **At a Glance:** status, urgency, next deadline, exposure, open issues.
- **Timeline:** every known event with source links and confidence.
- **Violations:** each allegation, ordinance/code reference, inspection date, compliance requirement, cure status, and evidence.
- **Evidence:** documents, photos, videos, permits, correspondence, service proof, public records.
- **Property Intelligence:** parcel, zoning, permits, prior cases, ownership/history, map context.
- **Issues & Findings:** missing evidence, contradictions, procedural checkpoints, and items needing human review.
- **Actions:** tasks, deadlines, record requests, calls, inspections, responses, appeals.
- **Communications:** draft and track letters/emails/forms; optionally connect to certified-mail workflows later.

### AI assistant

The assistant is case-grounded. It must distinguish:

- **Fact** — directly supported by evidence.
- **Inference** — reasoned from evidence but not directly stated.
- **Unknown** — evidence is missing.
- **Rule** — supplied by a jurisdiction policy source.
- **Recommendation** — proposed next step, requiring user approval.

It must never silently convert an absent record into proof that something did not happen.

## Initial analysis engine

The first deterministic checks should cover:

- notice/service completeness
- deadline and compliance-period calculation
- hearing/review/appeal references
- enforcement action before required notice or cure period
- duplicate or contradictory case events
- unexplained case status transitions
- penalty/fine escalation without supporting event
- missing inspection/photographic evidence
- permit/code relationship conflicts
- inconsistent property or parcel identifiers
- missing correspondence or response records

All findings include severity, rationale, evidence references, rule/policy version, and review status.

## Safety boundary

This is evidence-management, procedural-analysis, and workflow software. It does not decide that a violation is legally invalid, accuse an agency of misconduct, or replace an attorney. Jurisdictional rules must be reviewed before activation. Consequential communications require human approval.

## Development

The initial implementation targets Next.js + React + TypeScript with Cloudflare D1/R2 compatibility. Keep the architecture modular so the reusable FairProcess/FairProcessMaps engines can later be extracted into shared packages rather than copied indefinitely.
