/**
 * `executable` here means only: this client adapter (intake logic, runtime
 * validation, the matter-persistence adapter, and their tests) has real,
 * non-stub implementation code. It is a narrower claim than "production
 * launchable" -- traced against every consumer in this repository, nothing
 * reads this field; the workflow catalog's actual live/discoverable gate is
 * `manifest.maturity` (see packages/workflows/src/workflow-registry.ts's
 * executable() filter), which this workflow does not set to "executable".
 * There is no deployed application (no apps/verticals/secured-transactions)
 * mounting this workflow's route, and no real authenticated session
 * supplies an ownerId to the persistence adapter yet -- both are required
 * before this workflow could honestly be called production-executable.
 */
export const workflowRuntimeClient = {
  workflowId: "secured-transaction-eligibility",
  verticalId: "secured-transactions",
  executable: true,
  reason: "The intake UI, structured evidence model, runtime input validation, the shared evaluateSecuredTransactionEligibility engine, and a real ownership-scoped persistence adapter (via the same @mailmypdf/step-workflow runtime already used by notice-respond, private-office, and immigration-mail) are all implemented and covered by workflow, persistence/ownership, and acceptance tests. It produces a review-only ELIGIBLE TO CONTINUE / HUMAN REVIEW REQUIRED / BLOCKED result and takes no consequential action. It is not yet mounted in a deployed application/route, and no real authenticated session is wired to the persistence adapter.",
} as const;

export default workflowRuntimeClient;
