import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "amendment-continuation-assignment-termination" || input.verticalId !== "secured-transactions") {
      throw new Error("Amendment / Continuation / Assignment / Termination runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Amendment / Continuation / Assignment / Termination remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
