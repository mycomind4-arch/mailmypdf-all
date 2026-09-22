export const governmentNoticeExtractionSchema = {
  schemaId: "government-notice-analysis",
  schemaVersion: "1.0",
  noticeType: "government_agency_notice",
  extractionFields: {
    agency: { description: "Government agency sending notice", required: true, dataType: "string" },
    requestedInformation: { description: "Information or documents requested", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit response", required: true, dataType: "string" },
  },
  instructions: "Extract agency, information requested, deadline, and submission method.",
} as const

export default governmentNoticeExtractionSchema
