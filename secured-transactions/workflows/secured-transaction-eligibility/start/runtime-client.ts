export const workflowRuntimeClient = {
  workflowId: "secured-transaction-eligibility",
  verticalId: "secured-transactions",
  executable: true,
  reason: "The intake UI, runtime input validation, and the shared evaluateSecuredTransactionEligibility engine are wired end-to-end and covered by workflow and acceptance tests. This workflow does not yet persist to a durable matter store, authenticate a real user session, or exercise the manifest's document/evidence-extraction/research capabilities -- it produces a review-only ELIGIBLE TO CONTINUE / HUMAN REVIEW REQUIRED / BLOCKED result and takes no consequential action.",
} as const;

export default workflowRuntimeClient;
