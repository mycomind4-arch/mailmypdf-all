export const workflowIntelligencePlan = {
  workflowId: "priority-remediation",
  deterministicFirst: true,
  packages: [
    "@mailmypdf/identity-capacity",
    "@mailmypdf/secured-transactions",
    "@mailmypdf/jurisdiction-rules",
    "@mailmypdf/registry-adapters",
    "@mailmypdf/intelligence",
  ],
  focus: ["identified defect","supported correction","authorization","re-verification"],
  unresolvedRequiresHumanReview: true,
} as const;

export default workflowIntelligencePlan;
