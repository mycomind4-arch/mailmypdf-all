export const licensingExtractionSchema = {
  schemaId: "licensing-analysis",
  schemaVersion: "1.0",
  noticeType: "licensing_notice",
  extractionFields: {
    licenseType: { description: "Type of professional license", required: true, dataType: "string" },
    licensingAgency: { description: "Licensing agency sending notice", required: true, dataType: "string" },
    violationOrInquiry: { description: "Violation cited or inquiry made", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
  },
  instructions: "Extract license type, agency, violation/inquiry, and response deadline.",
} as const
export default licensingExtractionSchema
