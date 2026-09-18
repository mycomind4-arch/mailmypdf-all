export const workflowIntelligencePlan = {
  workflowId: "perfection-method-selection",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["collateral class","jurisdiction","method selection","exceptions"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
