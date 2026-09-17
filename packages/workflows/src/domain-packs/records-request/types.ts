export type RecordsRequestDeliveryMethod =
  | "certified_mail"
  | "registered_mail"
  | "first_class_mail"
  | "email"
  | "portal"
  | "in_person"
  | "other";

export type RecordsRequestLifecycleStageId =
  | "draft_request"
  | "review"
  | "approve"
  | "send"
  | "log_request"
  | "log_response"
  | "proof";

export interface RecordsRequestLifecycleStage {
  id: RecordsRequestLifecycleStageId;
  name: string;
  description: string;
  dependsOn: readonly RecordsRequestLifecycleStageId[];
  usesAI: boolean;
  requiresHumanApproval: boolean;
  consequential: boolean;
}

/**
 * Domain-level lifecycle migrated from the mature FairProcess public-records
 * workflow. Execution, approval, mailing, and proof remain owned by the shared
 * MailMyPDF workflow/runtime packages.
 */
export const RECORDS_REQUEST_LIFECYCLE: readonly RecordsRequestLifecycleStage[] = [
  {
    id: "draft_request",
    name: "Draft the request",
    description: "Identify the records sought precisely and prepare a reviewable request letter.",
    dependsOn: [],
    usesAI: true,
    requiresHumanApproval: false,
    consequential: false,
  },
  {
    id: "review",
    name: "Review the exact request",
    description: "A human reviews and edits the exact request content before any external action.",
    dependsOn: ["draft_request"],
    usesAI: false,
    requiresHumanApproval: false,
    consequential: false,
  },
  {
    id: "approve",
    name: "Approve for sending",
    description: "Record approval of the exact reviewed content using the shared approval gate.",
    dependsOn: ["review"],
    usesAI: false,
    requiresHumanApproval: true,
    consequential: false,
  },
  {
    id: "send",
    name: "Send the approved request",
    description: "Send through a configured fulfillment adapter or record an external send.",
    dependsOn: ["approve"],
    usesAI: false,
    requiresHumanApproval: true,
    consequential: true,
  },
  {
    id: "log_request",
    name: "Record the actual send",
    description: "Persist the real send date and method; never infer a send date from a draft or approval.",
    dependsOn: ["send"],
    usesAI: false,
    requiresHumanApproval: false,
    consequential: false,
  },
  {
    id: "log_response",
    name: "Record the outcome",
    description: "Record a received response or an explicitly confirmed non-response when the applicable window closes.",
    dependsOn: ["log_request"],
    usesAI: false,
    requiresHumanApproval: false,
    consequential: false,
  },
  {
    id: "proof",
    name: "Preserve proof",
    description: "Attach tracking, delivery, portal receipt, email evidence, and response artifacts to the matter record.",
    dependsOn: ["log_request"],
    usesAI: false,
    requiresHumanApproval: false,
    consequential: false,
  },
] as const;

export interface RecordsRequestAuthorityProfile {
  id: string;
  name: string;
  requestCitation?: string;
  withholdingInstruction?: string;
  responseTimingDescription?: string;
}

export const CALIFORNIA_CPRA_PROFILE: RecordsRequestAuthorityProfile = {
  id: "california-cpra",
  name: "California Public Records Act",
  requestCitation: "Cal. Gov. Code § 7920.000 et seq.",
  withholdingInstruction:
    "If records are withheld, identify the specific statutory basis for withholding or redaction.",
  responseTimingDescription:
    "Track the agency response from the actual request-send date using the applicable CPRA timing rules.",
};

export interface RecordsRequestDraftInput {
  recordsSought: string;
  agency?: string;
  recipient?: string;
  caseReference?: string;
  propertyReference?: string;
  dateRange?: string;
  priorRequestDates?: readonly string[];
  preferredFormat?: string;
  authority?: RecordsRequestAuthorityProfile;
  additionalInstructions?: readonly string[];
}

export interface RecordsRequestDraft {
  subject: string;
  body: string;
  openQuestions: readonly string[];
}

export interface RecordsRequestEvent {
  type: "records_request_sent" | "records_response_received" | "records_response_not_received";
  occurredOn: string;
  data: Readonly<Record<string, unknown>>;
}

export interface RecordsRequestTrackingResult {
  ok: boolean;
  event?: RecordsRequestEvent;
  error?: string;
}
