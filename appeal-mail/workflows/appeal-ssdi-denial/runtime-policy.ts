// The SSDI reconsideration policy and manifest are projected from the shared
// SSA factory artifact so web and ChatGPT execution use one runtime contract.
import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";
import { SSDI_REQUIRED_FORMS } from "./start/workflow";

const factoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");

if (!factoryArtifact || !factoryArtifact.factoryReady) {
  throw new Error("SSDI reconsideration factory artifact is not ready");
}

export const ssdiDenialRuntimePolicy = factoryArtifact.runtimePolicy;
export const ssdiOfficialFormKinds = SSDI_REQUIRED_FORMS.map((form) => form.kind);
export default ssdiDenialRuntimePolicy;
