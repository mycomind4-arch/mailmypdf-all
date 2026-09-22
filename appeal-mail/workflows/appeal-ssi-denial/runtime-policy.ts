// The SSI reconsideration policy is defined once in the shared platform
// registry (@mailmypdf/workflows ssa-reconsideration-runtime-policy) so the
// server enforces exactly the rules this workflow's UI is built around.
import { getSsaReconsiderationRuntimePolicy } from "@mailmypdf/workflows";
import { SSI_REQUIRED_FORMS, SSI_WORKFLOW_ID } from "./start/workflow";

export const ssiDenialRuntimePolicy = getSsaReconsiderationRuntimePolicy(SSI_WORKFLOW_ID)!;

export const ssiOfficialFormKinds = SSI_REQUIRED_FORMS.map((form) => form.kind);
export default ssiDenialRuntimePolicy;
