export const deadlineExtensionRequestDomain = {
  workflowId: "deadline-extension-request",
  name: "Deadline Extension Request",
  description: "Request extension with justification and supporting evidence",
  extractionSchemaIds: ["deadline-extension-analysis"],
  validationRules: [
    { rule: "extension_reasonable", description: "Requested extension is reasonable", severity: "warning" },
    { rule: "justification_compelling", description: "Justification adequately explains need", severity: "warning" },
  ],
  readinessChecks: [
    { check: "original_deadline_identified", description: "Current deadline identified", required: true },
    { check: "reason_documented", description: "Reason for extension documented", required: true },
    { check: "supporting_evidence_gathered", description: "Supporting evidence collected", required: true },
  ],
  grounds: [
    { id: "illness", label: "Illness/Health", description: "Medical emergency or illness" },
    { id: "unavailable_records", label: "Unavailable Records", description: "Cannot access needed records" },
  ],
  responseOptions: [
    { id: "formal_extension_request", label: "Formal Request", description: "Submit formal extension request" },
  ],
  outputPackageContents: [
    { item: "Formal extension request letter", required: true },
    { item: "Supporting evidence for extension", required: true },
  ],
} as const

export default deadlineExtensionRequestDomain
