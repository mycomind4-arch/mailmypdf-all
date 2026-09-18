/** Every required element has verified evidence with a source reference. */
export const allRequiredElementsVerified: Record<string, unknown> = {
  "identifiable-debtor": { status: "verified", sourceRefs: ["doc-debtor-1"] },
  "identifiable-secured-party": { status: "verified", sourceRefs: ["doc-secured-party-1"] },
  "actual-obligation": { status: "verified", sourceRefs: ["doc-obligation-1"] },
  "actual-value": { status: "verified", sourceRefs: ["doc-value-1"] },
  "debtor-rights-in-collateral": { status: "verified", sourceRefs: ["doc-collateral-rights-1"] },
  "authenticated-security-agreement-or-valid-alternative": {
    status: "verified",
    sourceRefs: ["doc-security-agreement-1"],
  },
  "specific-collateral": { status: "verified", sourceRefs: ["doc-collateral-desc-1"] },
  authorization: { status: "verified", sourceRefs: ["doc-authorization-1"] },
  "correct-jurisdiction": { status: "verified", sourceRefs: ["doc-jurisdiction-1"] },
};

export default allRequiredElementsVerified;
