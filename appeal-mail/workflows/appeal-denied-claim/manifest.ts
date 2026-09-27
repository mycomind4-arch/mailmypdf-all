import { createInsuranceAppealManifestForWorkflow } from "@mailmypdf/workflows";

const manifest = createInsuranceAppealManifestForWorkflow(
  "appeal-denied-claim",
  {
    maturity: "executable",
    route: "/appeal-mail/workflows/appeal-denied-claim/start",
  },
);

if (!manifest) {
  throw new Error("Missing shared insurance appeal manifest profile for appeal-denied-claim");
}

export const deniedClaimManifest = manifest;

export default deniedClaimManifest;
