export const workflowIntelligencePlan = {
  workflowId: "governing-law-filing-jurisdiction",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["debtor location","entity jurisdiction","rule coverage","filing office"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
