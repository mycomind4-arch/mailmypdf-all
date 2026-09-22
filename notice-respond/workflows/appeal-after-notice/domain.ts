export const appealAfterNoticeDomain = {
  workflowId: "appeal-after-notice",
  name: "Appeal After Notice",
  description: "Appeal initial decision with evidence and appeal brief",
  extractionSchemaIds: ["appeal-decision-analysis"],
  validationRules: [
    { rule: "appeal_deadline_not_passed", description: "Appeal within deadline", severity: "error" },
    { rule: "appeal_addresses_decision", description: "Appeal addresses reasons for decision", severity: "warning" },
  ],
  readinessChecks: [
    { check: "decision_understood", description: "Initial decision understood", required: true },
    { check: "appeal_deadline_confirmed", description: "Appeal deadline confirmed", required: true },
    { check: "supporting_evidence_gathered", description: "Supporting evidence collected", required: true },
  ],
  grounds: [
    { id: "legal_error", label: "Legal Error", description: "Initial decision based on legal error" },
    { id: "factual_error", label: "Factual Error", description: "Initial decision based on incorrect facts" },
  ],
  responseOptions: [
    { id: "appeal_brief", label: "Appeal Brief", description: "Submit appeal brief with supporting evidence" },
  ],
  outputPackageContents: [
    { item: "Appeal brief addressing initial decision", required: true },
    { item: "Supporting evidence and documentation", required: true },
  ],
} as const

export default appealAfterNoticeDomain
