import { createRecordsRequestManifest } from "@mailmypdf/workflows";

export const publicInformationRequestManifest = createRecordsRequestManifest({
  workflowId: "public-information-request",
  title: "Public Information Request",
  contextDocumentLabel: "Optional public-information context",
  supportingContextLabel: "Supporting public-information context",
});

export default publicInformationRequestManifest;
