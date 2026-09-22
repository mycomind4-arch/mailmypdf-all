export const complianceNoticeExtractionSchema = {
  schemaId: "compliance-notice-analysis",
  schemaVersion: "1.0",
  noticeType: "compliance_violation_notice",
  extractionFields: {
    violationsCited: { description: "Violations identified", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    regulatoryRequirements: { description: "Applicable regulations", required: true, dataType: "string" },
    submissionAddress: { description: "Where to submit response", required: false, dataType: "string" },
  },
  instructions: "Extract violations, deadline, and requirements from compliance notice.",
} as const

export default complianceNoticeExtractionSchema
