export const cp90Domain = {
  workflowId: "cp90-collection-notice-response",
  name: "CP90 Final Notice of Intent to Levy",
  description: "Respond to IRS levy notice with appeal request or payment plan",
  extractionSchemaIds: ["cp90-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response within 30 days", severity: "error" },
    { rule: "appeal_or_payment_proposed", description: "Appeal request or payment plan included", severity: "warning" },
  ],
  readinessChecks: [
    { check: "debt_amount_confirmed", description: "Tax debt amount confirmed", required: true },
    { check: "appeal_rights_understood", description: "Appeal rights understood", required: true },
    { check: "financial_documentation_gathered", description: "Financial documentation gathered", required: true },
  ],
  grounds: [
    { id: "request_hearing", label: "Request Hearing", description: "Request Collection Due Process hearing" },
    { id: "payment_plan", label: "Payment Plan", description: "Propose installment payment plan" },
  ],
  responseOptions: [
    { id: "cdp_hearing_request", label: "CDP Hearing Request", description: "Request Collection Due Process hearing to pause collection" },
    { id: "payment_proposal", label: "Payment Proposal", description: "Propose payment plan to resolve debt" },
  ],
  outputPackageContents: [
    { item: "Hearing request or payment plan proposal", required: true },
    { item: "Financial documentation supporting proposal", required: false },
  ],
} as const

export default cp90Domain
