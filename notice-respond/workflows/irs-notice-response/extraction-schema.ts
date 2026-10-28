export const irsGeneralExtractionSchema = {
  schemaId: "irs-general-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_general_notice",
  extractionFields: {
    noticeNumber: { description: "CP or letter number exactly as printed, if present; use to locate notice-specific instructions", required: false, dataType: "string" },
    issueDescription: { description: "Description of issue in notice", required: true, dataType: "string" },
    requiredAction: { description: "Action explicitly requested by notice, if any", required: false, dataType: "string" },
    responseDeadline: { description: "Exact calendar response date printed on the notice, if any; never calculate one from a relative period", required: false, dataType: "date" },
    responseDeadlineText: { description: "Deadline language exactly as printed, including relative periods such as within 30 days, if any", required: false, dataType: "string" },
    requiredForm: { description: "Notice-specific form or formal petition explicitly required, if any", required: false, dataType: "string" },
    responseChannel: { description: "Permitted response method stated on the notice, such as mail, secure upload, fax, telephone, or formal petition", required: false, dataType: "string" },
    submissionInstructions: { description: "Notice-specific submission instructions, if stated", required: false, dataType: "string" },
    mailingAddress: { description: "Mailing address printed on the controlling notice, if any; user must confirm before mailing", required: false, dataType: "string" },
  },
  instructions: "Classify whether the notice requests action and whether a mailed letter is an allowed response. Extract the printed notice number, exact deadline wording, required form, permitted response channel, instructions, and address with provenance. Leave missing values absent; never calculate a date from relative wording or invent a response deadline, extension, or recipient. A required upload, formal petition, or other nonmail action must not be replaced by a generic mailed letter.",
} as const
export default irsGeneralExtractionSchema
