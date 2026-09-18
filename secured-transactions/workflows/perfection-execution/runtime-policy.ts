import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "perfection-execution" || input.verticalId !== "secured-transactions") {
      throw new Error("Perfection Execution runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
