import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "ucc1-preparation-authorization" || input.verticalId !== "secured-transactions") {
      throw new Error("UCC-1 Preparation & Authorization runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("UCC-1 Preparation & Authorization remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
