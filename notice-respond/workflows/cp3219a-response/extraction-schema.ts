export const cp3219aExtractionSchema = {
  schemaId: "cp3219a-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_verification_notice",
  extractionFields: {
    taxYear: { description: "Tax year being verified", required: true, dataType: "string" },
    itemsQuestions: { description: "Items the IRS is questioning", required: true, dataType: "string" },
    responseDeadline: { description: "Deadline to respond", required: true, dataType: "date" },
    submissionAddress: { description: "Address to mail response", required: true, dataType: "string" },
  },
  instructions: "Extract tax year, questioned items, and submission deadline.",
} as const

export default cp3219aExtractionSchema
