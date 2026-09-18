import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "name-capacity-resolution" || input.verticalId !== "secured-transactions") {
      throw new Error("Name & Capacity Resolution runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
