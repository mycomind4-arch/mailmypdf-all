export const workflowIntelligencePlan = {
  workflowId: "collateral-ownership-classification",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["collateral inventory","ownership evidence","classification","description scope"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
