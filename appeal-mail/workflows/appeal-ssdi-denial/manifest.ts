import { createSsaReconsiderationManifestForWorkflow } from "@mailmypdf/workflows";

const manifest = createSsaReconsiderationManifestForWorkflow("appeal-ssdi-denial", {
  maturity: "executable",
  route: "/appeal-mail/workflows/appeal-ssdi-denial/start",
});

if (!manifest) {
  throw new Error("Missing shared SSA reconsideration manifest profile for appeal-ssdi-denial");
}

export const ssdiDenialManifest = manifest;

export default ssdiDenialManifest;
