export const irsBalanceDueExtractionSchema = {
  schemaId: "irs-balance-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_balance_due",
  extractionFields: {
    taxYear: { description: "Tax year of the debt", required: true, dataType: "string" },
    balanceDue: { description: "Amount of balance due including interest/penalties", required: true, dataType: "string" },
    paymentDeadline: { description: "Deadline to pay or respond", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit payment or response", required: true, dataType: "string" },
  },
  instructions: "Extract tax year, balance due, and payment deadline.",
} as const

export default irsBalanceDueExtractionSchema
