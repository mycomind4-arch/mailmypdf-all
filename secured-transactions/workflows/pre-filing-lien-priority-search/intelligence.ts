export const workflowIntelligencePlan = {
  workflowId: "pre-filing-lien-priority-search",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["search terms","source coverage","filing records","search limitations"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
