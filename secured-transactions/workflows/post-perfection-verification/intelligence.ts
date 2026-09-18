export const workflowIntelligencePlan = {
  workflowId: "post-perfection-verification",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["acceptance evidence","record accuracy","defects","verification"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
