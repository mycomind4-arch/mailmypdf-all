import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "security-agreement-generation" || input.verticalId !== "secured-transactions") {
      throw new Error("Security Agreement Generation runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Security Agreement Generation remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
