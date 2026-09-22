export const documentRequestExtractionSchema = {
  schemaId: "document-request-analysis",
  schemaVersion: "1.0",
  noticeType: "document_request",
  extractionFields: {
    requestedItems: { description: "Specific documents or categories requested", required: true, dataType: "string" },
    productionDeadline: { description: "Deadline for document production", required: true, dataType: "date" },
    deliveryMethod: { description: "How to deliver documents", required: true, dataType: "string" },
    deliveryAddress: { description: "Where to send documents", required: false, dataType: "string" },
  },
  instructions: "Extract requested items, deadline, and delivery method.",
} as const

export default documentRequestExtractionSchema
