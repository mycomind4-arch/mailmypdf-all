import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "priority-remediation" || input.verticalId !== "secured-transactions") {
      throw new Error("Priority Remediation runtime identity does not match this workflow.");
    }
  },
};

export default workflowRuntimePolicy;
