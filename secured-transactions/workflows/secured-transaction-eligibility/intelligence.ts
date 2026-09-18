export const workflowIntelligencePlan = {
  workflowId: "secured-transaction-eligibility",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["transaction basis","obligation and value","collateral rights","authorization"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
