import { allRequiredElementsVerified } from "./all-required-elements-verified";

/**
 * Two elements remain unverified (evidence exists but does not yet
 * establish the element), the rest verified.
 */
export const multipleUnresolvedElements: Record<string, unknown> = {
  ...allRequiredElementsVerified,
  "actual-obligation": {
    status: "unverified",
    sourceRefs: ["doc-obligation-draft-1"],
    note: "Only a draft term sheet has been supplied; no executed obligation document yet.",
  },
  "correct-jurisdiction": {
    status: "unverified",
    sourceRefs: ["doc-address-1"],
    note: "The debtor's registered location has not been confirmed against a public organic record.",
  },
};

export default multipleUnresolvedElements;
