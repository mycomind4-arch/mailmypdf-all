export const irsIdentityExtractionSchema = {
  schemaId: "irs-identity-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_identity_notice",
  extractionFields: {
    informationRequested: { description: "Specific identity information requested", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    secureSubmissionMethod: { description: "Secure method to submit identity info", required: true, dataType: "string" },
  },
  instructions: "Extract identity information request and secure submission method.",
} as const
export default irsIdentityExtractionSchema
