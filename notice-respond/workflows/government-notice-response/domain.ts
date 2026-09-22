export const governmentNoticeDomain = {
  workflowId: "government-notice-response",
  name: "Government Notice Response",
  description: "Respond to government agency notice with supporting documentation",
  extractionSchemaIds: ["government-notice-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
    { rule: "all_requirements_addressed", description: "All agency requirements addressed", severity: "warning" },
  ],
  readinessChecks: [
    { check: "notice_reviewed", description: "Government notice fully reviewed", required: true },
    { check: "requirements_understood", description: "Agency requirements understood", required: true },
    { check: "evidence_gathered", description: "Supporting evidence gathered", required: true },
  ],
  grounds: [
    { id: "comply_with_notice", label: "Comply with Notice", description: "Provide information/documents requested" },
  ],
  responseOptions: [
    { id: "agency_response", label: "Agency Response", description: "Submit response to government agency" },
  ],
  outputPackageContents: [
    { item: "Response addressing agency request", required: true },
    { item: "Supporting documentation and evidence", required: true },
  ],
} as const

export default governmentNoticeDomain
