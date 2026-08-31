# Dispute Mail Workflow Factory

## Rule

Finish Dispute Mail before moving to the next vertical. Every workflow below is a distinct customer problem and owns its own search intent, intake facts, evidence requirements, deadline policy, strategy, draft framing, and marketing page.

## 19 workflows

1. debt-collection-dispute
2. dispute-collection-agency
3. debt-dispute
4. debt-validation
5. credit-report
6. credit-report-collections
7. hard-inquiry
8. charge-off
9. medical-collections
10. student-loan
11. credit-card-billing
12. unauthorized-charge
13. billing-error
14. subscription-billing
15. service-contract
16. insurance-billing
17. follow-up-no-response
18. inadequate-response
19. cease-contact

## Gold build loop

For each workflow:

1. Search intent and canonical page
2. Problem-specific intake
3. Secure document ingest
4. Classification
5. Extraction
6. Facts + provenance
7. Timeline/deadline handling
8. Issues/discrepancies
9. Evidence checklist and verification
10. Authority/research layer where applicable
11. Risk review
12. Problem-specific strategy
13. Draft generation
14. Draft provenance
15. Validation
16. Blocking gate
17. Human review
18. Explicit approval
19. Payment verification
20. Authorized MailMyPDF submission
21. Tracking reconciliation
22. Proof/audit
23. Regression tests
24. Deployed end-to-end verification

## Current shared implementation

The vertical now has:

- `workflow-profiles.ts` — the 19 domain problem definitions
- `workflow-executor.ts` — reusable profile-driven execution
- `workflows.ts` — workflow registry
- `$workflowId.tsx` — SEO-aware problem page
- `$workflowId/start.tsx` — profile-specific intake/execution UI
- `dispute-fulfillment.ts` — shared approved MailMyPDF fulfillment boundary
- fail-closed MailMyPDF provider status mapping
- profile and executor regression suites

## Certification discipline

`executable` means the profile-driven intake/analysis/draft/gate engine is present.

`gold` requires real payment, authenticated fulfillment, tracking, proof/audit, regression coverage, and deployed end-to-end evidence.

Do not promote a workflow to Gold because it merely has a route, keyword, profile, draft, or test fixture.
