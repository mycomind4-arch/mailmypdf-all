import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "priority-strategy" || input.verticalId !== "secured-transactions") {
      throw new Error("Priority Strategy runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Priority Strategy remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
