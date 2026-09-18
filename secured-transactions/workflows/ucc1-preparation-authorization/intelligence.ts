export const workflowIntelligencePlan = {
  workflowId: "ucc1-preparation-authorization",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["debtor name","secured-party data","collateral indication","authorization"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
