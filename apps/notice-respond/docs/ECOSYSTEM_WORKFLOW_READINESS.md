# MailMyPDF Ecosystem Workflow Readiness Ledger

**Version:** 1.0
**Date:** 2026-08-25
**Purpose:** Canonical working ledger for upgrading workflows one at a time to the ecosystem L6 standard.

## Readiness levels

- **L0 Planned** — concept only; no implementation evidence.
- **L1 Blueprint** — registry/SEO/metadata concept exists, but no production workflow.
- **L2 Functional** — real workflow code/route exists, but intelligence and/or production gates are incomplete.
- **L3 Production** — executable, persisted, secured, validated and fulfillment-connected at the vertical's current standard.
- **L4 Multi-LLM Production** — L3 plus actual multi-provider AI execution with quorum/disagreement handling and provider/model provenance.
- **L5 Authority Gold** — L4 plus domain intelligence, evidence/provenance, authority/research, strategy and rigorous safety gates.
- **L6 Ecosystem Gold** — L5 plus exceptional workflow UX, fulfillment/proof, observability, regression coverage, and a competitive search-intent landing-page/content cluster.

**Hard rule:** declaring a workflow L4+ requires evidence that the actual production path invokes multi-LLM execution. Having an unused adapter, test, or capability declaration is not enough.

## Current verified ledger

| ID | Vertical | Current level | Target | Primary blocker / next action |
|---|---|---:|---:|---|
| cp14-response | Notice Respond | L5 | L6 | Finish ecosystem SEO/UX and prove multi-LLM production path |
| cp2000-response | Notice Respond | L3 | L6 | Connect existing gold intelligence to production route; then multi-LLM + SEO |
| cp504-response | Notice Respond | L3 | L6 | Authority/research, multi-LLM, provenance, SEO |
| irs-notice | Notice Respond | L3 | L6 | Deep domain intelligence + multi-LLM + authority SEO |
| court-summons | Notice Respond | L3 | L6 | Domain-specific intelligence, safety gates, multi-LLM |
| agency-action | Notice Respond | L3 | L6 | Domain-specific intelligence, multi-LLM, authority SEO |
| file-appeal | Notice Respond | L3 | L6 | Resolve ownership/vertical placement; multi-LLM and SEO |
| transunion-dispute | Dispute Mail | L3 | L6 | Verify/upgrade actual multi-LLM path; authority + SEO |
| experian-dispute | Dispute Mail | L3 | L6 | Verify/upgrade actual multi-LLM path; authority + SEO |
| equifax-dispute | Dispute Mail | L3 | L6 | Verify/upgrade actual multi-LLM path; authority + SEO |
| code-enforcement-records | Records Requests | L3 | L6 | **FIRST ACTIVE UPGRADE:** wire AI into production lifecycle, strengthen strategy/research/draft/validation, complete SEO fortress |
| government-communications-records | Records Requests | L3 | L6 | Wire AI into lifecycle; production/evidence/authority integration; SEO |
| police-records | Records Requests | L3 | L6 | Verify route/runtime integration, multi-LLM execution, authority + SEO |
| property-permit-records | Records Requests | L2/L3 | L6 | Complete production route, multi-LLM execution, evidence + SEO |
| planning-records | Records Requests | L2/L3 | L6 | Complete production intelligence and multi-LLM; SEO |
| i-797-analysis | Immigration Mail | L1 | L6 | Build canonical implementation |
| i-797c-analysis | Immigration Mail | L1 | L6 | Build canonical implementation |
| uscis-rfe-response | Immigration Mail | L1 | L6 | Build canonical implementation |
| insurance-claim-denied | Appeal Mail | L1 | L6 | Build canonical implementation |
| insurance-claim-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| health-insurance-denial | Appeal Mail | L1 | L6 | Build canonical implementation |
| roof-claim-denied | Appeal Mail | L1 | L6 | Build canonical implementation |
| workers-comp-denied | Appeal Mail | L1 | L6 | Build canonical implementation |
| life-insurance-claim-denied | Appeal Mail | L1 | L6 | Build canonical implementation |
| financial-aid-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| sap-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| ssdi-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| ssi-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| unemployment-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| medicaid-appeal | Appeal Mail | L1 | L6 | Build canonical implementation |
| credit-report-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| lexisnexis-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| hard-inquiry-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| collection-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| fcra-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| debt-collection-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| debt-validation | Dispute Mail | L1 | L6 | Build canonical implementation |
| fdcpa-dispute | Dispute Mail | L1 | L6 | Build canonical implementation |
| debt-lawsuit-response | Dispute Mail | L1 | L6 | Build canonical implementation |
| collection-cease-contact | Dispute Mail | L1 | L6 | Build canonical implementation |
| police-records-request | Records Requests | L1/L2 | L6 | Superseded by current police-records implementation; reconcile IDs and canonical route |
| police-report-request | Records Requests | L1/L2 | L6 | Reconcile with police-records implementation |
| public-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| open-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| foia-request | Records Requests | L1 | L6 | Build canonical implementation |
| court-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| arrest-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| birth-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| marriage-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| property-records-request | Records Requests | L1 | L6 | Build canonical implementation |
| permit-records-request | Records Requests | L1 | L6 | Reconcile with property-permit-records |
| code-enforcement-notice | Code Enforcement | L1 | L6 | Distinct from code-enforcement-records; build enforcement-response workflow |
| tenant-notice-response | Tenant Reply | L1 | L6 | Build canonical implementation |

## Private Office flagship queue

Private Office is intentionally tracked separately because its workflow model is matter-centric rather than simple letter generation.

| Workflow | Current level | Target |
|---|---:|---:|
| Contractor Dispute | L5 | L6 |
| Property Insurance Claim | L4/L5 | L6 |
| Bank & Wire Transfer Dispute | L4/L5 | L6 |
| Security Deposit Dispute | L4/L5 | L6 |
| Trust Beneficiary | L4/L5 | L6 |

## Appeal Mail actual-code reconciliation

The older ecosystem registry contains 12 Appeal Mail blueprint entries, but the repository currently contains a substantially larger set of workflow-specific route/code families. This discrepancy must be reconciled before the next bulk-build cycle. The following implementation families were observed in the current repository tree and therefore must not be treated as blueprint-only without further route verification:

- administrative-decision-appeal
- administrative-decision
- car-insurance
- claim-denial-letter
- court-ruling
- denied-claim
- dental
- drivers
- edd
- fafsa
- financial-aid-appeal
- reinstatement
- special-circumstances
- suspension
- government
- insurance-claim-denial
- insurance-coverage-denial
- insurance-denial-letter
- license-revocation
- license-suspension
- life-insurance
- medicaid
- medical-insurance
- medical-necessity
- out-of-network
- prior-auth
- reconsideration
- sap
- scholarship
- social-security
- ssdi-appeal
- ssdi-denial
- ssi-denial
- unemployment
- registration-suspension

These are provisionally **L2/L3 until each production route is verified**. They must not inherit the old registry's L1 label merely because the old registry was stale.

## Immigration Mail reconciliation

The current ecosystem registry has three immigration blueprints, but the Immigration Mail repository contains a broader workflow implementation surface. At minimum, the following families require direct current-state scoring before any mass upgrade:

- appeal / denial workflows
- biometrics
- case inquiry
- consular processing
- document analysis
- I-130
- I-131
- I-601
- I-751
- I-765
- I-797 / I-797C analysis
- I-90
- naturalization
- NOID
- RFE
- visa refusal

Provisionally score each **L2-L5 pending route + multi-LLM invocation verification**.

## Multi-LLM audit rule

A workflow is **not L4** unless all of the following are demonstrably true:

1. At least two configured providers can execute consequential tasks.
2. The workflow's production execution path calls the orchestrator.
3. Provider/model identity is retained.
4. Structured output is validated before use.
5. Provider failures are isolated and surfaced.
6. Disagreement is surfaced rather than silently collapsed.
7. High-impact actions fail closed when quorum is unavailable.
8. User facts, identifiers, hashes, ownership, payment and fulfillment state remain deterministic.

Records Requests currently contains a provider-agnostic multi-LLM orchestrator and workflow-specific Code Enforcement AI modules, but the review/approval lifecycle does not yet invoke those modules. Therefore Code Enforcement Records remains **L3, not L4**, until that connection is made.

## SEO L6 gate

Every workflow must have:

- search-intent definition
- primary and secondary keyword map
- long-tail/question cluster
- authoritative substantive content
- jurisdictional terminology where appropriate
- strong workflow CTA
- canonical metadata
- robots/sitemap discovery
- appropriate schema
- breadcrumbs/internal links
- supporting cluster pages
- related workflow links
- competitive differentiation
- content-to-product parity
- no thin/placeholder promise

SEO is scored independently from runtime maturity. A workflow can be L5 technically while remaining below L6 because its search-intent fortress is incomplete.

## Upgrade order

1. **Code Enforcement Records**
2. Government Communications Records
3. CP14 Response
4. Administrative Decision Appeal
5. Contractor Dispute (Private Office)
6. Property Insurance Claim (Private Office)
7. Bank & Wire Transfer Dispute (Private Office)
8. Security Deposit Dispute (Private Office)
9. CP2000 Response
10. Then clear the remaining catalog one workflow at a time.

## Source-of-truth warning

The older `MASTER_WORKFLOW_REGISTRY.md` was authored 2026-08-18 and is now stale relative to repository changes made through 2026-08-25. This document intentionally separates **planned/catalog inventory** from **verified current implementation** and should be updated whenever a workflow crosses a readiness gate.
