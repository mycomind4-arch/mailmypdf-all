import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "first-priority-determination" || input.verticalId !== "secured-transactions") {
      throw new Error("First-Priority Determination runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("First-Priority Determination remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
