export const irsGeneralExtractionSchema = {
  schemaId: "irs-general-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_general_notice",
  extractionFields: {
    issueDescription: { description: "Description of issue in notice", required: true, dataType: "string" },
    requiredAction: { description: "Action required by notice", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
  },
  instructions: "Extract notice issue, required action, and response deadline.",
} as const
export default irsGeneralExtractionSchema
