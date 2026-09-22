export const deadlineExtensionExtractionSchema = {
  schemaId: "deadline-extension-analysis",
  schemaVersion: "1.0",
  noticeType: "deadline_notice",
  extractionFields: {
    originalDeadline: { description: "Current deadline", required: true, dataType: "date" },
    extensionAuthority: { description: "Who can grant extension", required: true, dataType: "string" },
    submissionMethod: { description: "How to request extension", required: true, dataType: "string" },
  },
  instructions: "Extract deadline, authority, and submission method.",
} as const

export default deadlineExtensionExtractionSchema
