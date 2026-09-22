export const irsUnderreporterDomain = {
  workflowId: "irs-underreporter-notice-response",
  name: "IRS Underreporter Notice Response",
  description: "Respond to underreporter notice explaining amount discrepancy",
  extractionSchemaIds: ["irs-underreporter-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "discrepancy_identified", description: "Discrepancy between reported and 1099 identified", required: true },
    { check: "documentation_gathered", description: "Tax return and 1099 documentation gathered", required: true },
  ],
  grounds: [
    { id: "explain_discrepancy", label: "Explain Discrepancy", description: "Explain difference between reported and 1099 amount" },
  ],
  responseOptions: [
    { id: "explanation_response", label: "Explanation Response", description: "Provide explanation for income discrepancy" },
  ],
  outputPackageContents: [
    { item: "Explanation of reported vs 1099 discrepancy", required: true },
    { item: "Supporting documentation", required: true },
  ],
} as const
export default irsUnderreporterDomain
