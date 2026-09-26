import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "perfection-method-selection" || input.verticalId !== "secured-transactions") {
      throw new Error("Perfection Method Selection runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Perfection Method Selection remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
