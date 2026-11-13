import type { StepWorkflowDefinition } from "@mailmypdf/step-workflow";

/**
 * Draft-only flow. A separate authenticated server-side approval and provider
 * integration is required before a mailing step may be exposed.
 */
export const debtValidationStepWorkflow = {
  id: "debt-validation",
  title: "Debt Validation Request",
  steps: [
    { id: "notice", label: "Controlling notice" },
    { id: "dispute", label: "Dispute details" },
    { id: "review", label: "Review letter" },
  ],
} satisfies StepWorkflowDefinition;
