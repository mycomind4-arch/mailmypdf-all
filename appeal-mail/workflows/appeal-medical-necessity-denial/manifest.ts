import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const medicalNecessityDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-medical-necessity-denial",
  title: "Appeal a Medical Necessity Denial",
  primaryDocumentId: "medical-necessity-denial",
  primaryDocumentLabel: "Medical necessity denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default medicalNecessityDenialManifest;
