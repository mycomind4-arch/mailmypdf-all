import { getRecordsRequestFactoryArtifact } from "@mailmypdf/workflows";

const factoryArtifact = getRecordsRequestFactoryArtifact("public-records-request");

if (!factoryArtifact?.factoryReady) {
  throw new Error("Public Records Request factory artifact is not ready");
}

export const publicRecordsRequestManifest = factoryArtifact.definition;

export default publicRecordsRequestManifest;
