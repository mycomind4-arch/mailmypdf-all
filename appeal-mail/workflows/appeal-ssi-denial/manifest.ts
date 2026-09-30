import { getSsaReconsiderationFactoryArtifact } from "@mailmypdf/workflows";

const resolvedFactoryArtifact = getSsaReconsiderationFactoryArtifact("appeal-ssi-denial");

if (!resolvedFactoryArtifact) {
  throw new Error("SSI reconsideration factory artifact is missing");
}
if (!resolvedFactoryArtifact.factoryReady) {
  throw new Error("SSI reconsideration factory artifact is not ready");
}

const factoryArtifact = resolvedFactoryArtifact;

export const ssiDenialManifest = factoryArtifact.definition;

export default ssiDenialManifest;
