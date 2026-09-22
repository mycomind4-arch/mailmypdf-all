export const irsAuditDomain = {
  workflowId: "irs-audit-letter-response",
  name: "IRS Audit Letter Response",
  description: "Respond to IRS audit examination with organized documentation",
  extractionSchemaIds: ["irs-audit-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "audit_scope_understood", description: "Audit examination scope understood", required: true },
    { check: "documents_located", description: "Requested documents located", required: true },
    { check: "submission_date_confirmed", description: "Submission date and method confirmed", required: true },
  ],
  grounds: [
    { id: "submit_documentation", label: "Submit Documentation", description: "Provide requested documents for examination" },
  ],
  responseOptions: [
    { id: "document_submission", label: "Document Submission", description: "Submit documents for IRS examination" },
  ],
  outputPackageContents: [
    { item: "Organized documents by category", required: true },
    { item: "Submission cover letter and checklist", required: true },
  ],
} as const

export default irsAuditDomain
