export const stateTaxDomain = {
  workflowId: "state-tax-notice-response",
  name: "State Tax Notice Response",
  description: "Respond to state tax notice with supporting documentation",
  extractionSchemaIds: ["state-tax-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "tax_issue_understood", description: "State tax issue understood", required: true },
    { check: "tax_documentation_gathered", description: "Tax documentation gathered", required: true },
  ],
  grounds: [
    { id: "respond_to_tax", label: "Respond to Tax Issue", description: "Provide response to state tax notice" },
  ],
  responseOptions: [
    { id: "tax_response", label: "Tax Response", description: "Submit response to state tax issue" },
  ],
  outputPackageContents: [
    { item: "Response to state tax issue", required: true },
    { item: "Supporting tax documentation", required: true },
  ],
} as const
export default stateTaxDomain
