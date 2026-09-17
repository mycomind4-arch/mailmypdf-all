import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const insuranceCoverageDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-insurance-coverage-denial",
  title: "Appeal an Insurance Coverage Denial",
  primaryDocumentId: "insurance-coverage-denial",
  primaryDocumentLabel: "Insurance coverage denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default insuranceCoverageDenialManifest;
