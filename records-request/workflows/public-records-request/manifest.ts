import { createRecordsRequestManifest } from "@mailmypdf/workflows";

export const publicRecordsRequestManifest = createRecordsRequestManifest({
  workflowId: "public-records-request",
  title: "Public Records Request",
  contextDocumentLabel: "Optional notice, case, or agency context document",
  supportingContextLabel: "Supporting public-records context",
});

export default publicRecordsRequestManifest;
