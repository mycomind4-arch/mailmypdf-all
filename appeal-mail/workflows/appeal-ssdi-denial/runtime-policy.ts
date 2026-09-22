// The SSDI reconsideration policy is defined once in the shared platform
// registry (@mailmypdf/workflows ssa-reconsideration-runtime-policy) so the
// server enforces exactly the rules this workflow's UI is built around.
import { getSsaReconsiderationRuntimePolicy } from "@mailmypdf/workflows";
import { SSDI_REQUIRED_FORMS, SSDI_WORKFLOW_ID } from "./start/workflow";

export const ssdiDenialRuntimePolicy = getSsaReconsiderationRuntimePolicy(SSDI_WORKFLOW_ID)!;

export const ssdiOfficialFormKinds = SSDI_REQUIRED_FORMS.map((form) => form.kind);
export default ssdiDenialRuntimePolicy;
