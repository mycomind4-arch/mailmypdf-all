export const workflowIntelligencePlan = {
  workflowId: "obligation-value",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["obligation terms","value evidence","obligor and creditor roles","source conflicts"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
