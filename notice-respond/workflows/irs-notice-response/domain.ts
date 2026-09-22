export const irsGeneralDomain = {
  workflowId: "irs-notice-response",
  name: "General IRS Notice Response",
  description: "Respond to general IRS notice with appropriate documentation and action",
  extractionSchemaIds: ["irs-general-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "notice_understood", description: "Notice issue and required action understood", required: true },
    { check: "response_type_determined", description: "Response type determined", required: true },
  ],
  grounds: [
    { id: "respond_appropriately", label: "Respond Appropriately", description: "Provide response appropriate to notice type" },
  ],
  responseOptions: [
    { id: "general_response", label: "General Response", description: "Submit response to IRS notice" },
  ],
  outputPackageContents: [
    { item: "Response appropriate to notice type and issue", required: true },
    { item: "Supporting documentation as needed", required: false },
  ],
} as const
export default irsGeneralDomain
