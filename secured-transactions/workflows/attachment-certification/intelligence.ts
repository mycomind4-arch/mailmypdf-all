export const workflowIntelligencePlan = {
  workflowId: "attachment-certification",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["value","rights in collateral","agreement evidence","unresolved elements"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
