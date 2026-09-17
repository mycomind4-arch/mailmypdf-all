import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const carInsuranceClaimManifest = createInsuranceAppealManifest({
  workflowId: "appeal-car-insurance-claim",
  title: "Appeal a Car Insurance Claim",
  primaryDocumentId: "car-insurance-claim-decision",
  primaryDocumentLabel: "Car insurance claim decision",
  extractionSchema: "claim-denial-letter-v1",
  supportingEvidenceLabel: "Claim evidence",
});

export default carInsuranceClaimManifest;
