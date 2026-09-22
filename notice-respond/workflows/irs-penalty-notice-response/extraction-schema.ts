export const irsPenaltyExtractionSchema = {
  schemaId: "irs-penalty-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_penalty_notice",
  extractionFields: {
    penaltyType: { description: "Type of penalty assessed", required: true, dataType: "string" },
    penaltyAmount: { description: "Amount of penalty", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
  },
  instructions: "Extract penalty type, amount, and response deadline.",
} as const
export default irsPenaltyExtractionSchema
