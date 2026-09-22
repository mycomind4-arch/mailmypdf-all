export const civilSummonsExtractionSchema = {
  schemaId: "civil-summons-analysis",
  schemaVersion: "1.0",
  noticeType: "civil_summons",
  extractionFields: {
    court: { description: "Court name and location", required: true, dataType: "string" },
    caseNumber: { description: "Case number", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    mainAllegations: { description: "Main allegations in complaint", required: true, dataType: "string" },
    filingMethod: { description: "How to file answer", required: true, dataType: "string" },
  },
  instructions: "Extract court, case number, deadline, and allegations from summons.",
} as const

export default civilSummonsExtractionSchema
