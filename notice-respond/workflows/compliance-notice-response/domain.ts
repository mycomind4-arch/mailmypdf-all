export const complianceNoticeResponseDomain = {
  workflowId: "compliance-notice-response",
  name: "Compliance Violation Notice Response",
  description: "Respond with corrective action plan for violations",
  extractionSchemaIds: ["compliance-notice-analysis"],
  validationRules: [
    { rule: "all_violations_addressed", description: "Each violation must be addressed", severity: "error" },
    { rule: "timeline_realistic", description: "Correction timeline must be realistic", severity: "warning" },
  ],
  readinessChecks: [
    { check: "violations_identified", description: "All violations cited are identified", required: true },
    { check: "corrective_actions_planned", description: "Corrective actions for each violation", required: true },
    { check: "response_deadline_confirmed", description: "Response deadline confirmed", required: true },
  ],
  grounds: [
    { id: "corrected", label: "Already Corrected", description: "Violation already fixed" },
    { id: "action_plan", label: "Correction Plan", description: "Plan to correct violation" },
  ],
  responseOptions: [
    { id: "corrective_action", label: "Corrective Action Plan", description: "Submit plan to remedy violations" },
  ],
  outputPackageContents: [
    { item: "Response letter addressing each violation", required: true },
    { item: "Corrective action plan with timeline", required: true },
  ],
} as const

export default complianceNoticeResponseDomain
