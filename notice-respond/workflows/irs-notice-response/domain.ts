export const irsGeneralDomain = {
  workflowId: "irs-notice-response",
  name: "General IRS Notice Response",
  description: "Classify general IRS notices and prepare correspondence only when the notice-specific instructions support a mailed reply",
  extractionSchemaIds: ["irs-general-analysis"],
  validationRules: [
    { rule: "notice_specific_response_verified", description: "Before mailing, verify that correspondence is appropriate, preserve any printed deadline, and do not invent an extension or mailing address", severity: "error" },
  ],
  readinessChecks: [
    { check: "notice_understood", description: "Notice issue, whether action is requested, and any printed date understood", required: true },
    { check: "response_type_determined", description: "Before mailing, required form, response channel, and notice-specific instructions confirmed", required: true },
  ],
  grounds: [
    { id: "respond_appropriately", label: "Respond Appropriately", description: "Provide response appropriate to notice type" },
  ],
  responseOptions: [
    { id: "general_response", label: "General Response", description: "Prepare a mailed reply only when notice-specific instructions support one" },
    { id: "no_mail_needed", label: "Record only", description: "Keep an informational notice without generating outgoing mail" },
  ],
  outputPackageContents: [
    { item: "When correspondence is appropriate, a notice-specific response packet approved before mailing", required: false },
    { item: "Supporting documentation as needed", required: false },
  ],
} as const
export default irsGeneralDomain
