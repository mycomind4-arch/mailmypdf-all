export const cp90ExtractionSchema = {
  schemaId: "cp90-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_levy_notice",
  extractionFields: {
    debtAmount: { description: "Total tax debt amount", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond (30 days from notice)", required: true, dataType: "date" },
    appealRights: { description: "Collection Due Process appeal rights", required: true, dataType: "string" },
    submissionAddress: { description: "Address to submit response", required: true, dataType: "string" },
  },
  instructions: "Extract debt amount, response deadline, and appeal rights.",
} as const

export default cp90ExtractionSchema
