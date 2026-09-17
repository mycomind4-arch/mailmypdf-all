import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const dentalInsuranceDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-dental-insurance-denial",
  title: "Dental Insurance Appeal",
  primaryDocumentId: "dental-insurance-denial",
  primaryDocumentLabel: "Dental insurance denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default dentalInsuranceDenialManifest;
