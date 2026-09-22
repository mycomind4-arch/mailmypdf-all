export const agencyActionResponseDomain = {
  workflowId: "agency-action-response",
  name: "Agency Action Response",
  description: "Respond to agency action with objection and supporting evidence",
  extractionSchemaIds: ["agency-action-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
    { rule: "objection_substantive", description: "Objection addresses the action", severity: "warning" },
  ],
  readinessChecks: [
    { check: "action_understood", description: "Agency action and implications understood", required: true },
    { check: "objection_rights_confirmed", description: "Right to object confirmed", required: true },
    { check: "supporting_evidence_gathered", description: "Supporting evidence collected", required: true },
  ],
  grounds: [
    { id: "factual_error", label: "Factual Error", description: "Action based on incorrect facts" },
    { id: "legal_challenge", label: "Legal Challenge", description: "Action violates law or regulation" },
  ],
  responseOptions: [
    { id: "formal_objection", label: "Formal Objection", description: "Submit formal objection with evidence" },
  ],
  outputPackageContents: [
    { item: "Formal objection letter", required: true },
    { item: "Supporting evidence and facts", required: true },
  ],
} as const

export default agencyActionResponseDomain
