import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "post-perfection-verification" || input.verticalId !== "secured-transactions") {
      throw new Error("Post-Perfection Verification runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Post-Perfection Verification remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
