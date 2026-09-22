export const regulatoryDeficiencyDomain = {
  workflowId: "regulatory-deficiency-notice-response",
  name: "Regulatory Deficiency Notice Response",
  description: "Respond to regulatory deficiency with corrective action plan",
  extractionSchemaIds: ["regulatory-deficiency-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "deficiencies_understood", description: "Each deficiency understood", required: true },
    { check: "corrections_documented", description: "Corrections documented", required: true },
  ],
  grounds: [
    { id: "corrective_action", label: "Corrective Action", description: "Provide corrective action plan" },
  ],
  responseOptions: [
    { id: "deficiency_response", label: "Deficiency Response", description: "Submit corrective action response" },
  ],
  outputPackageContents: [
    { item: "Response to each deficiency with corrective actions", required: true },
    { item: "Supporting documentation of corrections", required: true },
  ],
} as const
export default regulatoryDeficiencyDomain
