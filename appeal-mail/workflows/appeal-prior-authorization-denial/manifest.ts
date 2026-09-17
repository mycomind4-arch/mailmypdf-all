import { createInsuranceAppealManifest } from "@mailmypdf/workflows";

export const priorAuthorizationDenialManifest = createInsuranceAppealManifest({
  workflowId: "appeal-prior-authorization-denial",
  title: "Appeal a Prior Authorization Denial",
  primaryDocumentId: "prior-authorization-denial",
  primaryDocumentLabel: "Prior authorization denial letter",
  extractionSchema: "claim-denial-letter-v1",
});

export default priorAuthorizationDenialManifest;
