export const irsGeneralExtractionSchema = {
  schemaId: "irs-general-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_general_notice",
  extractionFields: {
    issueDescription: { description: "Description of issue in notice", required: true, dataType: "string" },
    requiredAction: { description: "Action explicitly requested by notice, if any", required: false, dataType: "string" },
    responseDeadline: { description: "Response date printed on the notice, if any; never calculate one", required: false, dataType: "date" },
    submissionInstructions: { description: "Notice-specific response channel or required form, if stated", required: false, dataType: "string" },
    mailingAddress: { description: "Mailing address printed on the controlling notice, if any; user must confirm before mailing", required: false, dataType: "string" },
  },
  instructions: "Classify whether the notice requests action. Extract only notice-supported dates, instructions, and addresses with provenance. Leave missing values absent; never invent a response deadline, extension, or recipient.",
} as const
export default irsGeneralExtractionSchema
