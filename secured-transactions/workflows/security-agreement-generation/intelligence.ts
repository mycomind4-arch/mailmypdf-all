export const workflowIntelligencePlan = {
  workflowId: "security-agreement-generation",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["party identity","obligation","collateral description","execution review"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
