export const irs30DayExtractionSchema = {
  schemaId: "irs-30-day-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_30_day_letter",
  extractionFields: {
    taxYear: { description: "Tax year under examination", required: true, dataType: "string" },
    proposedAdjustments: { description: "Adjustments the IRS is proposing", required: true, dataType: "string" },
    protestDeadline: { description: "Deadline to file protest (30 days)", required: true, dataType: "date" },
    protestAddress: { description: "Address to mail protest", required: true, dataType: "string" },
  },
  instructions: "Extract tax year, proposed adjustments, and protest deadline.",
} as const

export default irs30DayExtractionSchema
