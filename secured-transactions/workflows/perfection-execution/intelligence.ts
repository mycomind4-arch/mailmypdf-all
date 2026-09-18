export const workflowIntelligencePlan = {
  workflowId: "perfection-execution",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["approved method","execution evidence","receipts","status"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
