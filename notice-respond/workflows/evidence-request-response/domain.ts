export const evidenceRequestResponseDomain = {
  workflowId: "evidence-request-response",
  name: "Evidence Request Response",
  description: "Respond to evidence request with organized document submission",
  extractionSchemaIds: ["evidence-request-analysis"],
  validationRules: [
    { rule: "evidence_complete", description: "All requested evidence included or explained", severity: "warning" },
    { rule: "evidence_relevant", description: "Evidence is relevant to request", severity: "warning" },
  ],
  readinessChecks: [
    { check: "request_reviewed", description: "Evidence request reviewed and understood", required: true },
    { check: "evidence_located", description: "Requested evidence located", required: true },
    { check: "submission_deadline_confirmed", description: "Submission deadline confirmed", required: true },
  ],
  grounds: [
    { id: "document_submission", label: "Document Submission", description: "Submit requested documents" },
  ],
  responseOptions: [
    { id: "complete_submission", label: "Complete Submission", description: "Submit all requested evidence" },
  ],
  outputPackageContents: [
    { item: "All requested evidence documents", required: true },
    { item: "Cover letter identifying evidence", required: true },
  ],
} as const

export default evidenceRequestResponseDomain
