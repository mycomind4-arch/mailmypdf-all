export const irsUnderreporterExtractionSchema = {
  schemaId: "irs-underreporter-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_underreporter_notice",
  extractionFields: {
    discrepancyDescription: { description: "Description of reported vs 1099 discrepancy", required: true, dataType: "string" },
    reportedAmount: { description: "Amount reported on tax return", required: true, dataType: "string" },
    document1099Amount: { description: "Amount shown on 1099 or information document", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
  },
  instructions: "Extract discrepancy, reported amount, 1099 amount, and deadline.",
} as const
export default irsUnderreporterExtractionSchema
