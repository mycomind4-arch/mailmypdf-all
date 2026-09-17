import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const timelyFilingDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-timely-filing-denial",
  title: "Appeal a Timely Filing Denial",
  primaryDocumentId: "timely-filing-denial",
  primaryDocumentLabel: "Timely filing denial letter",
  extractionSchema: "claim-denial-letter-v1",
  supportingEvidenceLabel: "Filing and submission evidence",
});

export default timelyFilingDenialManifest;
