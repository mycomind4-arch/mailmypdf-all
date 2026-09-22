export const irsIdentityDomain = {
  workflowId: "irs-identity-information-notice-response",
  name: "IRS Identity Information Notice Response",
  description: "Respond to IRS identity or authority verification request",
  extractionSchemaIds: ["irs-identity-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response before deadline", severity: "error" },
  ],
  readinessChecks: [
    { check: "identity_information_identified", description: "Identity information requested identified", required: true },
    { check: "verification_documents_gathered", description: "Verification documents gathered", required: true },
  ],
  grounds: [
    { id: "verify_identity", label: "Verify Identity", description: "Provide identity or authority verification" },
  ],
  responseOptions: [
    { id: "identity_response", label: "Identity Response", description: "Submit identity verification response" },
  ],
  outputPackageContents: [
    { item: "Response with identity or authority information", required: true },
    { item: "Supporting verification documentation", required: true },
  ],
} as const
export default irsIdentityDomain
