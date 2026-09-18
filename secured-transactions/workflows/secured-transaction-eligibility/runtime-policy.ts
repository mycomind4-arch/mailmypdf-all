import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "secured-transaction-eligibility" || input.verticalId !== "secured-transactions") {
      throw new Error("Secured-Transaction Eligibility runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
