import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const lifeInsuranceDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-life-insurance-denial",
  title: "Life Insurance Denial Appeal",
  primaryDocumentId: "life-insurance-denial",
  primaryDocumentLabel: "Life insurance denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default lifeInsuranceDenialManifest;
