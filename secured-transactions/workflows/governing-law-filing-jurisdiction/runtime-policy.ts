import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "governing-law-filing-jurisdiction" || input.verticalId !== "secured-transactions") {
      throw new Error("Governing Law & Filing Jurisdiction runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Governing Law & Filing Jurisdiction remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
