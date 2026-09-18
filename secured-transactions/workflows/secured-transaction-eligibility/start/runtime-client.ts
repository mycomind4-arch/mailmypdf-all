export const workflowRuntimeClient = {
  workflowId: "secured-transaction-eligibility",
  verticalId: "secured-transactions",
  executable: false,
  reason: "Workflow-specific deterministic rules, authority coverage, review UI, and acceptance tests are incomplete.",
} as const;

export default workflowRuntimeClient;
