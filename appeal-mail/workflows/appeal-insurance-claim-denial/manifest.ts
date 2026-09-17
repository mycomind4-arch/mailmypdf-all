import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const insuranceClaimDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-insurance-claim-denial",
  title: "Appeal an Insurance Claim Denial",
  primaryDocumentId: "insurance-claim-denial",
  primaryDocumentLabel: "Insurance claim denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default insuranceClaimDenialManifest;
