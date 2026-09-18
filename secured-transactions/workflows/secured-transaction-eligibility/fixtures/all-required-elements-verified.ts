/** Every required element has verified evidence with a structured source reference. */
export const allRequiredElementsVerified: Record<string, unknown> = {
  "identifiable-debtor": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-debtor-1", label: "Debtor identity document" }],
  },
  "identifiable-secured-party": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-secured-party-1", label: "Secured party identity document" }],
  },
  "actual-obligation": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-obligation-1", label: "Signed promissory note" }],
  },
  "actual-value": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-value-1", label: "Funds transfer confirmation" }],
  },
  "debtor-rights-in-collateral": {
    status: "verified",
    sources: [{ kind: "registry", id: "doc-collateral-rights-1", label: "Title/registry ownership record" }],
  },
  "authenticated-security-agreement-or-valid-alternative": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-security-agreement-1", label: "Executed security agreement" }],
  },
  "specific-collateral": {
    status: "verified",
    sources: [{ kind: "document", id: "doc-collateral-desc-1", label: "Collateral description schedule" }],
  },
  authorization: {
    status: "verified",
    sources: [{ kind: "authority", id: "doc-authorization-1", label: "Authorization / resolution to encumber" }],
  },
  "correct-jurisdiction": {
    status: "verified",
    sources: [{ kind: "registry", id: "doc-jurisdiction-1", label: "Public organic record confirming location" }],
  },
};

export default allRequiredElementsVerified;
