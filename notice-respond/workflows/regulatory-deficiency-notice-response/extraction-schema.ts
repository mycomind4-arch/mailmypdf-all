export const regulatoryDeficiencyExtractionSchema = {
  schemaId: "regulatory-deficiency-analysis",
  schemaVersion: "1.0",
  noticeType: "regulatory_deficiency",
  extractionFields: {
    deficienciesCited: { description: "Deficiencies cited", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    submissionAddress: { description: "Where to submit response", required: true, dataType: "string" },
  },
  instructions: "Extract deficiencies and response deadline.",
} as const
export default regulatoryDeficiencyExtractionSchema
