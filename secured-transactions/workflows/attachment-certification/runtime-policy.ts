import type { WorkflowRuntimePolicy } from "@mailmypdf/workflows";

export const workflowRuntimePolicy: WorkflowRuntimePolicy = {
  validateMatter(input) {
    if (input.workflowId !== "attachment-certification" || input.verticalId !== "secured-transactions") {
      throw new Error("Attachment Certification runtime identity does not match this workflow.");
    }
  },

  validateInput() {
    throw new Error("Attachment Certification remains scaffolded and does not accept platform runtime input.");
  },
};

export default workflowRuntimePolicy;
