export const workflowIntelligencePlan = {
  workflowId: "first-priority-determination",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["competing interests","supported priority rules","exceptions","confidence"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
