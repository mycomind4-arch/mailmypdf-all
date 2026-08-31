# Ecosystem Master Workflow Architecture

## Core rule

Each standalone vertical repository is the **master product/workflow home** for that domain. It may contain multiple specialized sub-workflows, landing pages, document types, analysis paths, and response flows.

MailMyPDF remains the shared platform for identity, document handling, payments, physical mailing, tracking, proof, and shared UI primitives.

## Hierarchy

```text
MailMyPDF platform
├── shared identity
├── documents
├── billing
├── mailing
├── tracking
├── proof
└── design system

Vertical repository
├── master product experience
├── SEO/search-intent architecture
├── specialized workflows
├── domain-specific analysis
├── document schemas
├── evidence/timeline views where needed
├── response/drafting flows
└── MailMyPDF handoff
```

## Examples

### Appeal Mail

Master home for appeal/response workflows, with subflows such as government appeals, benefits appeals, insurance appeals, reconsiderations, and evidence-backed response drafting where they share the same core case model.

### Notice Respond

Master home for notice-driven workflows, with subflows such as government notices, compliance notices, agency correspondence, deadline-driven responses, and notice-specific document analysis.

### Dispute Mail

Master home for dispute workflows, with subflows such as consumer disputes, debt disputes, billing disputes, service disputes, and evidence-backed response letters.

### Tenant Reply

Master home for tenant/landlord correspondence, with subflows for notices, repair/maintenance disputes, deposit disputes, lease correspondence, and related response workflows.

### Insurance Claims

Master home for claims correspondence, with subflows for claim responses, denials, underpayment disputes, documentation requests, and appeals.

### Benefits Appeal

Master home for benefits decisions and appeals, with agency/program-specific subflows added only when authoritative rules and workflows are supported.

### Permit Response

Master home for permit/planning/inspection response workflows. Reuse property, evidence, and jurisdiction technology from Code Enforcement/FairProcessMaps instead of duplicating it.

### Debt Defense

Master home for debt-collection correspondence and disputes. Reuse the shared dispute/evidence infrastructure and compare carefully with Dispute Mail to avoid duplicate products.

### Records Requests

Master home for public-records request workflows, with subflows for police records, code enforcement, property records, permits, government correspondence, and production auditing.

### Code Enforcement

Master home for code-enforcement/property workflows, including notice analysis, property context, evidence, procedural timelines, records requests, and response/appeal preparation.

## SEO rule

The vertical repository owns the public search intent for its domain. Sub-workflows should target distinct user problems and should not become thin doorway pages. Canonical URLs, internal links, structured data, and content should reflect the actual workflow shipped in that repository.

## Product rule

Do not create a new repository merely because a new workflow exists. Create a new repository only when the workflow has a distinct customer-facing product identity, search intent, information architecture, and independently deployable experience.
