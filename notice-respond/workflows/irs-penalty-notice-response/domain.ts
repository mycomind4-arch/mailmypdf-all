export const irsPenaltyDomain = {
  workflowId: "irs-penalty-notice-response",
  name: "IRS Penalty Notice Response",
  description: "Respond to penalty with reasonable cause claim and abatement request",
  extractionSchemaIds: ["irs-penalty-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response within deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "penalty_type_understood", description: "Penalty type understood", required: true },
    { check: "reasonable_cause_evaluated", description: "Reasonable cause evaluated", required: true },
  ],
  grounds: [
    { id: "reasonable_cause", label: "Reasonable Cause", description: "Reasonable cause for penalty abatement" },
  ],
  responseOptions: [
    { id: "abatement_request", label: "Abatement Request", description: "Request penalty abatement based on reasonable cause" },
  ],
  outputPackageContents: [
    { item: "Reasonable cause claim with facts and circumstances", required: true },
    { item: "Supporting documentation for claim", required: true },
  ],
} as const
export default irsPenaltyDomain
