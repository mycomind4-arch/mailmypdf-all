import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";

const factoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssi-denial");

if (!factoryArtifact || !factoryArtifact.factoryReady) {
  throw new Error("SSI reconsideration factory artifact is not ready");
}

export const ssiDenialManifest = factoryArtifact.definition;
export default ssiDenialManifest;
