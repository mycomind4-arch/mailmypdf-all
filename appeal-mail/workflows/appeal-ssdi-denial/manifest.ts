import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";

const factoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");

if (!factoryArtifact || !factoryArtifact.factoryReady) {
  throw new Error("SSDI reconsideration factory artifact is not ready");
}

export const ssdiDenialManifest = factoryArtifact.definition;
export default ssdiDenialManifest;
