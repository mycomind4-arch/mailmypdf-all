// The SSI reconsideration policy and manifest are projected from the shared
// SSA factory artifact so web and ChatGPT execution use one runtime contract.
import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";
import { SSI_REQUIRED_FORMS } from "./start/workflow";

const factoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssi-denial");

if (!factoryArtifact || !factoryArtifact.factoryReady) {
  throw new Error("SSI reconsideration factory artifact is not ready");
}

export const ssiDenialRuntimePolicy = factoryArtifact.runtimePolicy;
export const ssiOfficialFormKinds = SSI_REQUIRED_FORMS.map((form) => form.kind);
export default ssiDenialRuntimePolicy;
