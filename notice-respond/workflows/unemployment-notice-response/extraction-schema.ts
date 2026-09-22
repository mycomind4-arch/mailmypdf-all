export const unemploymentExtractionSchema = {
  schemaId: "unemployment-analysis",
  schemaVersion: "1.0",
  noticeType: "unemployment_notice",
  extractionFields: {
    issue: { description: "Specific unemployment issue", required: true, dataType: "string" },
    appealDeadline: { description: "Deadline to appeal", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit appeal", required: true, dataType: "string" },
  },
  instructions: "Extract unemployment issue, deadline, and submission method.",
} as const
export default unemploymentExtractionSchema
