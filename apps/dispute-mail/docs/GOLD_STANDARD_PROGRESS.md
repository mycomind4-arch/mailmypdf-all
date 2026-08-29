# Dispute Mail — Gold Standard Progress

Updated: 2026-08-20

## Portfolio status

Dispute Mail has 19 problem-specific workflows sharing one domain execution engine, one AI contract, one fulfillment adapter, one lifecycle contract, and one marketing/page architecture.

| Gold stage | Portfolio state |
|---|---|
| Keyword/problem mapping | COMPLETE |
| Workflow registry | COMPLETE |
| Problem-specific profiles | COMPLETE |
| Search-intent pages | COMPLETE |
| Profile-specific intake | COMPLETE |
| Deterministic analysis/gates | COMPLETE |
| Evidence status contract | COMPLETE |
| Human evidence review surface | COMPLETE |
| Claude analysis/drafting/validation adapter | COMPLETE (server integration) |
| Canonical workflow dispatcher | COMPLETE |
| Persistent case lifecycle contract | COMPLETE (adapter pending) |
| Owner-scoped persistence | CONTRACT COMPLETE; real adapter pending |
| Real document upload | INTERNAL SERVER ENDPOINT COMPLETE; user auth wiring pending |
| Payment verification | SHARED FULFILLMENT CONTRACT COMPLETE; live Stripe auth/state pending |
| MailMyPDF fulfillment | SHARED ADAPTER COMPLETE; deployment credentials pending |
| Tracking reconciliation | CONTRACT/PATH PENDING |
| Proof/audit persistence | CONTRACT/PATH PENDING |
| Full authenticated UI execution | PENDING |
| Deployed E2E | PENDING |
| Gold certification | NOT YET CLAIMED |

## Workflow portfolio

All 19 workflows currently share the same complete problem-specific engine:

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

## Remaining work before leaving Dispute Mail

1. Bind real user authentication to the owner-scoped case repository.
2. Bind Supabase persistence to the case/evidence/audit contracts.
3. Connect real authenticated document upload/storage to each workflow.
4. Persist analysis, evidence verification, draft provenance, review, and approval.
5. Bind verified payment state to the pre-mail authorization gate.
6. Call the MailMyPDF fulfillment adapter from the authenticated workflow UI.
7. Persist provider order IDs and idempotency keys.
8. Reconcile MailMyPDF tracking events into case state.
9. Persist hash-linked proof/audit.
10. Run full 19-workflow regression/build suite.
11. Deploy staging.
12. Execute authorized staging E2E transactions.
13. Promote each workflow to Gold individually only after evidence is recorded.

No workflow should be promoted merely because its keyword page, profile, AI adapter, or draft exists.
