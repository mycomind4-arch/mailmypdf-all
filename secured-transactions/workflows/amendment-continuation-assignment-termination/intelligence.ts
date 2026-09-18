export const workflowIntelligencePlan = {
  workflowId: "amendment-continuation-assignment-termination",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["existing record","requested lifecycle action","authorization","rule coverage"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
