import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "obligation-value" || input.verticalId !== "secured-transactions") {
      throw new Error("Obligation & Value runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
