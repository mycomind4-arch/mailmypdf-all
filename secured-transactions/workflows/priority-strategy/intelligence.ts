export const workflowIntelligencePlan = {
  workflowId: "priority-strategy",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["known interests","supported rule paths","exceptions","review gates"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
