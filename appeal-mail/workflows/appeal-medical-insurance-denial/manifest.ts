import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const medicalInsuranceDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-medical-insurance-denial",
  title: "Appeal a Medical Insurance Denial",
  primaryDocumentId: "medical-insurance-denial",
  primaryDocumentLabel: "Medical insurance denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default medicalInsuranceDenialManifest;
