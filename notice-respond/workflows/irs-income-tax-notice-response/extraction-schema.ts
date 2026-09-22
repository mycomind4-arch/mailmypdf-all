export const irsIncomeExtractionSchema = {
  schemaId: "irs-income-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_income_notice",
  extractionFields: {
    questionedIncomeItems: { description: "Income items the IRS is questioning", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    submissionAddress: { description: "Address to mail response", required: true, dataType: "string" },
  },
  instructions: "Extract questioned income items and response deadline.",
} as const
export default irsIncomeExtractionSchema
