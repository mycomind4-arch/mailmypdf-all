export const licensingDomain = {
  workflowId: "licensing-notice-response",
  name: "Licensing Notice Response",
  description: "Respond to professional licensing agency with compliance documentation",
  extractionSchemaIds: ["licensing-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "violation_understood", description: "License violation or inquiry understood", required: true },
    { check: "compliance_documentation_gathered", description: "Compliance documentation gathered", required: true },
  ],
  grounds: [
    { id: "demonstrate_compliance", label: "Demonstrate Compliance", description: "Demonstrate compliance with licensing requirements" },
  ],
  responseOptions: [
    { id: "compliance_response", label: "Compliance Response", description: "Submit response demonstrating compliance" },
  ],
  outputPackageContents: [
    { item: "Response addressing violation or inquiry", required: true },
    { item: "Supporting license and compliance documentation", required: true },
  ],
} as const
export default licensingDomain
