export const irsBalanceDueDomain = {
  workflowId: "irs-balance-due-notice-response",
  name: "IRS Balance Due Notice Response",
  description: "Respond to balance due with payment, payment plan, hardship, or dispute",
  extractionSchemaIds: ["irs-balance-analysis"],
  validationRules: [
    { rule: "response_deadline_reasonable", description: "Response timeframe reasonable", severity: "warning" },
  ],
  readinessChecks: [
    { check: "balance_amount_confirmed", description: "Balance due amount confirmed", required: true },
    { check: "response_option_selected", description: "Response option selected (pay/plan/hardship/dispute)", required: true },
  ],
  grounds: [
    { id: "pay_in_full", label: "Pay in Full", description: "Pay the complete balance due" },
    { id: "payment_plan", label: "Payment Plan", description: "Propose installment agreement" },
    { id: "hardship_claim", label: "Hardship Claim", description: "Claim financial hardship" },
    { id: "dispute_liability", label: "Dispute Liability", description: "Dispute the tax liability" },
  ],
  responseOptions: [
    { id: "payment_response", label: "Payment Response", description: "Send payment or arrange payment plan" },
    { id: "hardship_request", label: "Hardship Request", description: "Request consideration of hardship" },
    { id: "liability_dispute", label: "Dispute Response", description: "Dispute the liability" },
  ],
  outputPackageContents: [
    { item: "Payment confirmation or payment plan proposal", required: true },
    { item: "Supporting documentation if applicable", required: false },
  ],
} as const

export default irsBalanceDueDomain
