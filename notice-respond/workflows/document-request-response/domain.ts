export const documentRequestDomain = {
  workflowId: "document-request-response",
  name: "Document Request Response",
  description: "Respond to document request with organized document production",
  extractionSchemaIds: ["document-request-analysis"],
  validationRules: [
    { rule: "production_deadline_not_passed", description: "Documents produced before deadline", severity: "error" },
    { rule: "all_items_addressed", description: "All requested items addressed", severity: "warning" },
  ],
  readinessChecks: [
    { check: "request_reviewed", description: "Document request fully reviewed", required: true },
    { check: "documents_located", description: "Responsive documents located", required: true },
    { check: "privilege_reviewed", description: "Privilege review completed", required: true },
  ],
  grounds: [
    { id: "produce_documents", label: "Produce Documents", description: "Produce responsive documents" },
    { id: "withhold_privilege", label: "Withhold for Privilege", description: "Withhold privileged documents with privilege log" },
  ],
  responseOptions: [
    { id: "document_production", label: "Document Production", description: "Produce responsive documents with cover letter" },
  ],
  outputPackageContents: [
    { item: "Cover letter identifying produced documents", required: true },
    { item: "Responsive documents organized and numbered", required: true },
  ],
} as const

export default documentRequestDomain
