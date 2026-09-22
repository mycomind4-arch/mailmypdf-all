export const irsIncomeDomain = {
  workflowId: "irs-income-tax-notice-response",
  name: "IRS Income Tax Notice Response",
  description: "Respond to IRS income tax notice with supporting documentation",
  extractionSchemaIds: ["irs-income-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
    { rule: "income_documented", description: "Income items documented", severity: "warning" },
  ],
  readinessChecks: [
    { check: "questioned_items_identified", description: "Questioned income items identified", required: true },
    { check: "income_documentation_gathered", description: "Income documentation gathered", required: true },
  ],
  grounds: [
    { id: "support_income", label: "Support with Documentation", description: "Provide documentation supporting reported income" },
  ],
  responseOptions: [
    { id: "income_response", label: "Income Response", description: "Submit response supporting reported income" },
  ],
  outputPackageContents: [
    { item: "Response addressing questioned income items", required: true },
    { item: "Supporting income documentation", required: true },
  ],
} as const
export default irsIncomeDomain
