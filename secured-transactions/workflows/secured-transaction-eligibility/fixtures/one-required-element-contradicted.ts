import { allRequiredElementsVerified } from "./all-required-elements-verified";

/**
 * Every element verified except "debtor-rights-in-collateral", where
 * material evidence contradicts the claimed right.
 */
export const oneRequiredElementContradicted: Record<string, unknown> = {
  ...allRequiredElementsVerified,
  "debtor-rights-in-collateral": {
    status: "contradicted",
    sources: [{ kind: "registry", id: "doc-title-search-1", label: "Title search" }],
    note: "A title search shows a third party, not the proposed debtor, holds record ownership of the collateral.",
  },
};

export default oneRequiredElementContradicted;
