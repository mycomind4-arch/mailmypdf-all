export const appealAfterNoticeExtractionSchema = {
  schemaId: "appeal-decision-analysis",
  schemaVersion: "1.0",
  noticeType: "decision_notice",
  extractionFields: {
    decisionReasoning: { description: "Reasons for initial decision", required: true, dataType: "string" },
    appealDeadline: { description: "Deadline to appeal", required: true, dataType: "date" },
    appealAuthority: { description: "Authority hearing the appeal", required: true, dataType: "string" },
    submissionMethod: { description: "How to submit appeal", required: true, dataType: "string" },
  },
  instructions: "Extract decision reasoning, appeal deadline, and submission method.",
} as const

export default appealAfterNoticeExtractionSchema
