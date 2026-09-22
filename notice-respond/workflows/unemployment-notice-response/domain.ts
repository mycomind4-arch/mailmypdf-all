export const unemploymentDomain = {
  workflowId: "unemployment-notice-response",
  name: "Unemployment Notice Response",
  description: "Respond to unemployment notice with appeal or documentation",
  extractionSchemaIds: ["unemployment-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Appeal within deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "unemployment_issue_identified", description: "Unemployment issue identified", required: true },
    { check: "employment_documentation_gathered", description: "Employment documentation gathered", required: true },
  ],
  grounds: [
    { id: "appeal_denial", label: "Appeal Denial", description: "Appeal claim denial" },
    { id: "appeal_overpayment", label: "Dispute Overpayment", description: "Dispute overpayment claim" },
  ],
  responseOptions: [
    { id: "unemployment_appeal", label: "Unemployment Appeal", description: "File appeal to unemployment decision" },
  ],
  outputPackageContents: [
    { item: "Appeal or response to unemployment notice", required: true },
    { item: "Supporting employment documentation", required: true },
  ],
} as const
export default unemploymentDomain
