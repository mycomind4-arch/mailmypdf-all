import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "pre-filing-lien-priority-search" || input.verticalId !== "secured-transactions") {
      throw new Error("Pre-Filing Lien & Priority Search runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
