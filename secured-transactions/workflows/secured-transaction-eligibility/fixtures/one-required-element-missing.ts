import { allRequiredElementsVerified } from "./all-required-elements-verified";

/** Every element verified except "actual-value", which has no evidence at all. */
export const oneRequiredElementMissing: Record<string, unknown> = Object.fromEntries(
  Object.entries(allRequiredElementsVerified).filter(([gateId]) => gateId !== "actual-value"),
);

export default oneRequiredElementMissing;
