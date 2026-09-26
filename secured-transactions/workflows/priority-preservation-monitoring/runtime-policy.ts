import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "priority-preservation-monitoring" || input.verticalId !== "secured-transactions") {
      throw new Error("Priority Preservation & Monitoring runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Priority Preservation Monitoring remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
