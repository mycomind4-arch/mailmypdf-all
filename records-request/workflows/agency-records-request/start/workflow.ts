export const AGENCY_RECORDS_REQUEST_WORKFLOW_ID = "agency-records-request";
export const RECORDS_REQUEST_VERTICAL_ID = "records-request";

export const AGENCY_RECORDS_REQUEST_STEPS = [
  { id: "scope", label: "Request scope" },
  { id: "context", label: "Context" },
  { id: "authority", label: "Authority" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "send", label: "Pay & send" },
  { id: "response", label: "Response" },
] as const;

export type AgencyRecordsRequestStepId = (typeof AGENCY_RECORDS_REQUEST_STEPS)[number]["id"];

export const AGENCY_RECORDS_CONTEXT_KINDS = [
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

export type AgencyRecordsContextKind = (typeof AGENCY_RECORDS_CONTEXT_KINDS)[number][0];

export function agencyRecordsRequestCompletedSteps(input: {
  scopeConfirmed: boolean;
  includedContextDocumentsReady: boolean;
  authorityStatusRecorded: boolean;
  draftSaved: boolean;
  approvalSaved: boolean;
  sendRecorded: boolean;
  responseOutcomeRecorded: boolean;
}): AgencyRecordsRequestStepId[] {
  const completed: AgencyRecordsRequestStepId[] = [];
  if (input.scopeConfirmed) completed.push("scope");
  // Context is optional. Mark it complete once the user has either reached the
  // step with no selected documents or every included document is clean.
  if (input.includedContextDocumentsReady) completed.push("context");
  if (input.authorityStatusRecorded) completed.push("authority");
  if (input.draftSaved) completed.push("draft");
  if (input.approvalSaved) completed.push("review");
  if (input.sendRecorded) completed.push("send");
  if (input.responseOutcomeRecorded) completed.push("response");
  return completed;
}

export function isIncludedContextReady(
  documents: readonly {
    role: "subject_notice" | "evidence";
    included: boolean;
    usable: boolean;
    security_status: string;
  }[],
): boolean {
  const selected = documents.filter(
    (document) => document.role === "subject_notice" || (document.role === "evidence" && document.included),
  );
  return selected.every((document) => document.usable && document.security_status === "clean");
}
