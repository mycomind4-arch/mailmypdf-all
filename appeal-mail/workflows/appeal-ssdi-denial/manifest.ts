import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";

const resolvedFactoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");

if (!resolvedFactoryArtifact) {
  throw new Error("SSDI reconsideration factory artifact is missing");
}
if (!resolvedFactoryArtifact.factoryReady) {
  throw new Error("SSDI reconsideration factory artifact is not ready");
}

const factoryArtifact = resolvedFactoryArtifact;

export const ssdiDenialManifest = factoryArtifact.definition;

export default ssdiDenialManifest;
