export const stateRevenueDomain = {
  workflowId: "state-revenue-department-notice-response",
  name: "State Revenue Department Notice Response",
  description: "Respond to state revenue notice with supporting documentation",
  extractionSchemaIds: ["state-revenue-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "issue_understood", description: "Revenue issue understood", required: true },
    { check: "documentation_gathered", description: "Supporting documentation gathered", required: true },
  ],
  grounds: [
    { id: "respond_to_revenue", label: "Respond to Issue", description: "Provide response to revenue notice" },
  ],
  responseOptions: [
    { id: "revenue_response", label: "Revenue Response", description: "Submit response to revenue issue" },
  ],
  outputPackageContents: [
    { item: "Response to state revenue issue", required: true },
    { item: "Supporting documentation", required: true },
  ],
} as const
export default stateRevenueDomain
