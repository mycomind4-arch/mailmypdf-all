export const irs30DayDomain = {
  workflowId: "irs-30-day-letter-response",
  name: "IRS 30-Day Letter Response",
  description: "Respond to IRS audit findings with protest or acceptance",
  extractionSchemaIds: ["irs-30-day-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response within 30 days", severity: "error" },
    { rule: "protest_substantive", description: "Protest addresses adjustments", severity: "warning" },
  ],
  readinessChecks: [
    { check: "adjustments_understood", description: "Proposed adjustments understood", required: true },
    { check: "protest_decision_made", description: "Decision to protest or accept made", required: true },
    { check: "evidence_gathered", description: "Supporting evidence collected", required: true },
  ],
  grounds: [
    { id: "disagree_findings", label: "Disagree with Findings", description: "Protest proposed adjustments" },
    { id: "accept_findings", label: "Accept Findings", description: "Accept proposed adjustments" },
  ],
  responseOptions: [
    { id: "formal_protest", label: "Formal Protest", description: "File formal protest to IRS Appeals" },
    { id: "acceptance", label: "Acceptance", description: "Notify IRS of acceptance" },
  ],
  outputPackageContents: [
    { item: "Protest statement or acceptance letter", required: true },
    { item: "Supporting evidence and legal arguments", required: true },
  ],
} as const

export default irs30DayDomain
