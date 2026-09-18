import { createRecordsRequestManifest } from "@mailmypdf/workflows";

export const governmentDocumentsRequestManifest = createRecordsRequestManifest({
  workflowId: "government-documents-request",
  title: "Government Documents Request",
  contextDocumentLabel: "Optional government-document context",
  supportingContextLabel: "Supporting government-document context",
});

export default governmentDocumentsRequestManifest;
