/* Domain for benefits notice response workflow */

export const benefitsNoticeResponseDomain = {
  workflowId: "benefits-notice-response",
  name: "Benefits Denial Notice Response",
  description: "Appeal government benefits denial with evidence organization and deadline tracking",
  extractionSchemaIds: ["benefits-notice-analysis"],
  validationRules: [
    {
      rule: "appeal_deadline_not_passed",
      description: "Appeal deadline must not have passed",
      severity: "error",
    },
    {
      rule: "evidence_relevant",
      description: "Evidence should address the denial reason",
      severity: "warning",
    },
  ],
  readinessChecks: [
    {
      check: "denial_notice_provided",
      description: "Complete benefits denial notice is provided",
      required: true,
    },
    {
      check: "denial_reason_identified",
      description: "Specific denial reason has been identified",
      required: true,
    },
    {
      check: "appeal_deadline_confirmed",
      description: "Appeal deadline has been confirmed",
      required: true,
    },
    {
      check: "supporting_evidence_gathered",
      description: "Supporting evidence addressing denial reason is gathered",
      required: true,
    },
  ],
  grounds: [
    { id: "factual_error", label: "Factual Error", description: "Denial based on incorrect facts" },
    { id: "policy_violation", label: "Policy Violation", description: "Denial violates policy" },
    { id: "missing_evidence", label: "Missing Evidence", description: "New evidence supports eligibility" },
  ],
  responseOptions: [
    { id: "formal_appeal", label: "Formal Appeal", description: "File written appeal with evidence" },
    { id: "administrative_review", label: "Administrative Review", description: "Request case review" },
  ],
  outputPackageContents: [
    { item: "Appeal letter with specific denial address", required: true },
    { item: "Supporting evidence for the appeal", required: true },
    { item: "Copy of denial notice for reference", required: true },
  ],
} as const

export default benefitsNoticeResponseDomain
