export const cp3219aDomain = {
  workflowId: "cp3219a-response",
  name: "CP3219-A Response",
  description: "Respond to IRS tax return verification with supporting documentation",
  extractionSchemaIds: ["cp3219a-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
    { rule: "documentation_complete", description: "Documentation addresses all questioned items", severity: "warning" },
  ],
  readinessChecks: [
    { check: "verification_items_identified", description: "Items being verified identified", required: true },
    { check: "documentation_located", description: "Supporting documentation located", required: true },
    { check: "response_deadline_confirmed", description: "Response deadline confirmed", required: true },
  ],
  grounds: [
    { id: "support_documentation", label: "Support with Documentation", description: "Provide documentation supporting the return items" },
  ],
  responseOptions: [
    { id: "verification_response", label: "Verification Response", description: "Submit documentation to IRS verification request" },
  ],
  outputPackageContents: [
    { item: "Detailed response to each verification question", required: true },
    { item: "Supporting documentation for questioned items", required: true },
  ],
} as const

export default cp3219aDomain
