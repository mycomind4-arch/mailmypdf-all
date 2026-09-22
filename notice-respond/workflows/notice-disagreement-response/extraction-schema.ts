export const noticeDisagreementExtractionSchema = {
  schemaId: "notice-disagreement-analysis",
  schemaVersion: "1.0",
  noticeType: "generic_notice",
  extractionFields: {
    specificDisagreements: { description: "Specific points of disagreement", required: true, dataType: "string" },
    submissionMethod: { description: "How to submit disagreement", required: true, dataType: "string" },
  },
  instructions: "Extract specific disagreements and submission method.",
} as const
export default noticeDisagreementExtractionSchema
