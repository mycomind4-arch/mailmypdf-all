export const workflowIntelligencePlan = {
  workflowId: "priority-preservation-monitoring",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["continuation dates","change events","new filings","maintenance"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
