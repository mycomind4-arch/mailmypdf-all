export const workflowIntelligencePlan = {
  workflowId: "name-capacity-resolution",
  deterministicFirst: true,
  engines: [
    "name-normalization",
    "source-authority",
    "authoritative-name",
    "entity-classification",
    "capacity-resolution",
    "authority-to-act",
    "ownership-rights",
    "obligation-resolution",
    "party-role-resolution",
    "jurisdiction-resolution",
    "name-capacity-certification",
  ],
  package: "@mailmypdf/identity-capacity",
  unresolvedRequiresHumanReview: true,
} as const;
export default workflowIntelligencePlan;
