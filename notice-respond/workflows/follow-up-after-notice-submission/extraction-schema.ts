export const followUpAfterNoticeExtractionSchema = {
  schemaId: "submission-tracking",
  schemaVersion: "1.0",
  noticeType: "tracking_inquiry",
  extractionFields: {
    originalSubmissionDate: { description: "Date of original submission", required: true, dataType: "date" },
    trackingNumber: { description: "Mailing or filing tracking number", required: true, dataType: "string" },
    receivingAuthority: { description: "Authority that received submission", required: true, dataType: "string" },
    contactMethod: { description: "How to inquire about status", required: true, dataType: "string" },
  },
  instructions: "Extract submission date, tracking, and authority contact information.",
} as const

export default followUpAfterNoticeExtractionSchema
