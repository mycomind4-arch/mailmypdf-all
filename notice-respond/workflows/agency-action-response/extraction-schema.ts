export const agencyActionExtractionSchema = {
  schemaId: "agency-action-analysis",
  schemaVersion: "1.0",
  noticeType: "agency_action_notice",
  extractionFields: {
    actionTaken: { description: "What action agency took", required: true, dataType: "string" },
    objectionRights: { description: "Your right to object", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond or object", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit objection", required: true, dataType: "string" },
    agency: { description: "Name of agency", required: true, dataType: "string" },
  },
  instructions: "Extract agency action, objection rights, and response deadline.",
} as const

export default agencyActionExtractionSchema
