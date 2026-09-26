import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "obligation-value" || input.verticalId !== "secured-transactions") {
      throw new Error("Obligation & Value runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Obligation & Value remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
