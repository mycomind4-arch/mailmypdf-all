export const followUpAfterNoticeDomain = {
  workflowId: "follow-up-after-notice-submission",
  name: "Follow Up After Notice Submission",
  description: "Track status of submitted response and prepare follow-up communications",
  extractionSchemaIds: ["submission-tracking"],
  validationRules: [
    { rule: "original_submission_confirmed", description: "Original submission tracking confirmed", severity: "warning" },
  ],
  readinessChecks: [
    { check: "submission_proof_collected", description: "Mailing or filing confirmation collected", required: true },
    { check: "contact_information_gathered", description: "Contact information for follow-up inquiry", required: true },
  ],
  grounds: [
    { id: "status_inquiry", label: "Status Inquiry", description: "Send inquiry to confirm receipt" },
  ],
  responseOptions: [
    { id: "follow_up_letter", label: "Follow Up Letter", description: "Send follow-up letter requesting confirmation" },
  ],
  outputPackageContents: [
    { item: "Status verification of original submission", required: true },
    { item: "Follow-up letter if confirmation needed", required: false },
  ],
} as const

export default followUpAfterNoticeDomain
