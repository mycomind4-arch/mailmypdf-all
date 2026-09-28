import { createSsaReconsiderationManifestForWorkflow } from "@mailmypdf/workflows";

const manifest = createSsaReconsiderationManifestForWorkflow("appeal-ssi-denial", {
  maturity: "executable",
  route: "/appeal-mail/workflows/appeal-ssi-denial/start",
});

if (!manifest) {
  throw new Error("Missing shared SSA reconsideration manifest profile for appeal-ssi-denial");
}

export const ssiDenialManifest = manifest;

export default ssiDenialManifest;
