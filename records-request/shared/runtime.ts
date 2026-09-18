export const RECORDS_REQUEST_VERTICAL_ID = "records-request";

export const RECORDS_REQUEST_STEPS = [
  { id: "scope", label: "Request scope" },
  { id: "context", label: "Context" },
  { id: "authority", label: "Authority" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "send", label: "Pay & send" },
  { id: "response", label: "Response" },
] as const;

export type RecordsRequestStepId =
  (typeof RECORDS_REQUEST_STEPS)[number]["id"];

export const RECORDS_REQUEST_CONTEXT_KINDS = [
  ["notice", "Agency notice or letter"],
  ["case_correspondence", "Case correspondence"],
  ["incident_reference", "Incident or report reference"],
  ["permit_record", "Permit or inspection document"],
  ["property_record", "Property or parcel record"],
  ["screenshot", "Screenshot or portal capture"],
  ["prior_request", "Prior records request"],
  ["prior_response", "Prior agency response"],
  ["other", "Other context document"],
] as const;

export type RecordsRequestContextKind =
  (typeof RECORDS_REQUEST_CONTEXT_KINDS)[number][0];

export function includedRecordsContextReady(
  documents: readonly {
    role: "subject_notice" | "evidence";
    included: boolean;
    usable: boolean;
    securityStatus: string;
  }[],
): boolean {
  const selected = documents.filter(
    (document) =>
      document.role === "subject_notice" ||
      (document.role === "evidence" && document.included),
  );
  return selected.every(
    (document) => document.usable && document.securityStatus === "clean",
  );
}

export function completedRecordsRequestSteps(input: {
  scopeConfirmed: boolean;
  contextReviewed: boolean;
  contextReady: boolean;
  authorityReviewed: boolean;
  draftSaved: boolean;
  approvalSaved: boolean;
  actualSendRecorded: boolean;
  responseOutcomeRecorded: boolean;
}): RecordsRequestStepId[] {
  const completed: RecordsRequestStepId[] = [];
  if (input.scopeConfirmed) completed.push("scope");
  if (input.contextReviewed && input.contextReady) completed.push("context");
  if (input.authorityReviewed) completed.push("authority");
  if (input.draftSaved) completed.push("draft");
  if (input.approvalSaved) completed.push("review");
  if (input.actualSendRecorded) completed.push("send");
  if (input.responseOutcomeRecorded) completed.push("response");
  return completed;
}
