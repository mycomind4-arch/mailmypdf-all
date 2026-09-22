export const stateRevenueExtractionSchema = {
  schemaId: "state-revenue-analysis",
  schemaVersion: "1.0",
  noticeType: "state_revenue_notice",
  extractionFields: {
    revenueIssue: { description: "Specific revenue issue", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    submissionAddress: { description: "Where to submit response", required: true, dataType: "string" },
  },
  instructions: "Extract revenue issue and response deadline.",
} as const
export default stateRevenueExtractionSchema
