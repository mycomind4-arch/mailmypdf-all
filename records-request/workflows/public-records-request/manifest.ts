import { getRecordsRequestFactoryArtifact } from "@mailmypdf/workflows";

const resolvedFactoryArtifact = getRecordsRequestFactoryArtifact("public-records-request");

if (!resolvedFactoryArtifact) {
  throw new Error("Public Records Request factory artifact is missing");
}
if (!resolvedFactoryArtifact.factoryReady) {
  throw new Error("Public Records Request factory artifact is not ready");
}

const factoryArtifact = resolvedFactoryArtifact;

export const publicRecordsRequestManifest = factoryArtifact.definition;

export default publicRecordsRequestManifest;
