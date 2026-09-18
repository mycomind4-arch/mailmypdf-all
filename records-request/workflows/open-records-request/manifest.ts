import { createRecordsRequestManifest } from "@mailmypdf/workflows";

export const openRecordsRequestManifest = createRecordsRequestManifest({
  workflowId: "open-records-request",
  title: "Open Records Request",
  contextDocumentLabel: "Optional open-records context document",
  supportingContextLabel: "Supporting open-records context",
});

export default openRecordsRequestManifest;
