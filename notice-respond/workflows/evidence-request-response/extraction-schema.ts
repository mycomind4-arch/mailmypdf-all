export const evidenceRequestExtractionSchema = {
  schemaId: "evidence-request-analysis",
  schemaVersion: "1.0",
  noticeType: "evidence_request",
  extractionFields: {
    evidenceRequested: { description: "What evidence is requested", required: true, dataType: "string" },
    submissionDeadline: { description: "Deadline to submit evidence", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit evidence", required: true, dataType: "string" },
    submissionAddress: { description: "Where to send evidence", required: false, dataType: "string" },
  },
  instructions: "Extract evidence requirements, deadline, and submission method.",
} as const

export default evidenceRequestExtractionSchema
