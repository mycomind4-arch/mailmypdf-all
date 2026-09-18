import { allRequiredElementsVerified } from "./all-required-elements-verified";

/**
 * Two elements remain unverified (evidence exists but does not yet
 * establish the element), the rest verified.
 */
export const multipleUnresolvedElements: Record<string, unknown> = {
  ...allRequiredElementsVerified,
  "actual-obligation": {
    status: "unverified",
    sources: [{ kind: "document", id: "doc-obligation-draft-1", label: "Draft term sheet" }],
    note: "Only a draft term sheet has been supplied; no executed obligation document yet.",
  },
  "correct-jurisdiction": {
    status: "unverified",
    sources: [{ kind: "user-confirmed", id: "user-address-1", label: "User-stated debtor address" }],
    note: "The debtor's registered location has not been confirmed against a public organic record.",
  },
};

export default multipleUnresolvedElements;
