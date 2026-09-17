import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const outOfNetworkDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-out-of-network-denial",
  title: "Appeal an Out-of-Network Denial",
  primaryDocumentId: "out-of-network-denial",
  primaryDocumentLabel: "Out-of-network denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default outOfNetworkDenialManifest;
