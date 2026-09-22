export const stateTaxExtractionSchema = {
  schemaId: "state-tax-analysis",
  schemaVersion: "1.0",
  noticeType: "state_tax_notice",
  extractionFields: {
    taxIssue: { description: "Specific state tax issue", required: true, dataType: "string" },
    taxYear: { description: "Tax year in question", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
  },
  instructions: "Extract tax issue, tax year, and response deadline.",
} as const
export default stateTaxExtractionSchema
