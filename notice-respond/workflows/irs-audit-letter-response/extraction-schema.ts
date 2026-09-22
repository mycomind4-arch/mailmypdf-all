export const irsAuditExtractionSchema = {
  schemaId: "irs-audit-analysis",
  schemaVersion: "1.0",
  noticeType: "irs_audit_notice",
  extractionFields: {
    taxYear: { description: "Tax year being audited", required: true, dataType: "string" },
    examinationScope: { description: "Scope of IRS examination", required: true, dataType: "string" },
    submissionDeadline: { description: "Deadline to submit documents", required: true, dataType: "date" },
    submissionMethod: { description: "How to submit documents", required: true, dataType: "string" },
  },
  instructions: "Extract tax year, examination scope, and submission deadline.",
} as const

export default irsAuditExtractionSchema
