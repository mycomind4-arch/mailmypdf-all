# Insurance Claims

**Status: Gold Standard build in progress.**

Insurance Claims turns a confusing insurance claim into an evidence-backed case record: understand the claim position, organize supporting documents, track events and deadlines, identify gaps, prepare a factual response or appeal, review it, and hand it to MailMyPDF for fulfillment and proof.

## Canonical Insurance Claims workflow standard

**Claim → Coverage/Documents → Evidence → Timeline → Gaps → Response/Appeal → Review → Mail/Proof**

Every workflow in this vertical uses this domain standard, while individual workflows own their specific intake fields, evidence requirements, risk level, search intent, and output type.

## Workflow catalog

The first production catalog contains 16 workflows:

1. Prepare an Insurance Claim
2. Respond to a Denied Insurance Claim
3. Dispute an Underpaid Insurance Claim
4. Dispute an Insurance Claim
5. Respond to a Coverage Denial
6. Prepare a Water Damage Insurance Claim
7. Prepare a Roof Damage Insurance Claim
8. Prepare a Fire or Smoke Damage Claim
9. Prepare a Property Damage Claim
10. Prepare an Auto Insurance Claim
11. Respond to a Denied Auto Insurance Claim
12. Prepare a Theft or Vandalism Claim
13. Prepare a Commercial Property Claim
14. Respond to a Denied Life Insurance Claim
15. Respond to a Health or Medical Insurance Denial
16. Respond to a Disability Insurance Denial

The catalog and SEO metadata live in `domain/insurance-workflows.ts` and `SEO/INSURANCE_WORKFLOW_KEYWORD_RESEARCH.md`.

## Domain guardrails

Never invent coverage, policy terms, claim entitlement, causation, valuation, or legal conclusions. Preserve provenance for material assertions and clearly distinguish policy text, insurer statements, user-provided facts, extracted facts, and generated suggestions.

High-risk and consequential workflows require human review before fulfillment.

## Shared infrastructure

Reuse the MailMyPDF Platform for authentication, tenancy, document/evidence provenance, timeline/deadline reasoning, approval/payment boundaries, MailMyPDF fulfillment, tracking, and proof. Do not create a parallel intelligence stack.

The Records Requests vertical is the primary technical scaffold for production-grade submission, attestation, idempotency, webhook verification, and proof; Insurance Claims owns the domain workflow layer.

## SEO

Keyword research is maintained per workflow with US search volume, CPC, competition, primary intent, and supporting clusters. High-intent denial and claim-dispute workflows are prioritized alongside large property/auto/water/roof demand clusters.
