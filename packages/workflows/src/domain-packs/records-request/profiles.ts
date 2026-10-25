import { GENERATED_RECORDS_REQUEST_WORKFLOW_PROFILES } from "./generated-profiles.js";

export interface RecordsRequestWorkflowProfile {
  workflowId: string;
  title: string;
  recordsSoughtPlaceholder: string;
  contextDocumentLabel?: string;
  supportingContextLabel?: string;
}

const CORE_RECORDS_REQUEST_WORKFLOW_PROFILES = Object.freeze([
  {
    workflowId: "agency-records-request",
    title: "Agency Records Request",
    recordsSoughtPlaceholder:
      "Describe the agency records, categories, subjects, dates, case or incident references, and other identifiers that will help locate the records.",
  },
  {
    workflowId: "government-documents-request",
    title: "Government Documents Request",
    recordsSoughtPlaceholder:
      "Describe the government documents you want using document types, subjects, dates, departments, case numbers, addresses, or other locating details.",
  },
  {
    workflowId: "open-records-request",
    title: "Open Records Request",
    recordsSoughtPlaceholder:
      "Describe the open records you want using record types, subjects, dates, departments, case numbers, addresses, or other locating details.",
  },
  {
    workflowId: "public-information-request",
    title: "Public Information Request",
    recordsSoughtPlaceholder:
      "Describe the public information or records you want using subjects, dates, departments, record types, references, addresses, or other locating details.",
  },
  {
    workflowId: "public-records-request",
    title: "Public Records Request",
    recordsSoughtPlaceholder:
      "Identify the public records you want as specifically as possible: record types, subjects, dates, departments, case numbers, addresses, or other locating details.",
    contextDocumentLabel: "Optional notice, case, or agency context document",
    supportingContextLabel: "Supporting public-records context",
  },
] as const satisfies readonly RecordsRequestWorkflowProfile[]);

export const RECORDS_REQUEST_WORKFLOW_PROFILES = Object.freeze([
  ...CORE_RECORDS_REQUEST_WORKFLOW_PROFILES,
  ...GENERATED_RECORDS_REQUEST_WORKFLOW_PROFILES,
] as const satisfies readonly RecordsRequestWorkflowProfile[]);

export type RecordsRequestProfileWorkflowId =
  (typeof RECORDS_REQUEST_WORKFLOW_PROFILES)[number]["workflowId"];

export function getRecordsRequestWorkflowProfile(
  workflowId: string,
): RecordsRequestWorkflowProfile | null {
  return (
    RECORDS_REQUEST_WORKFLOW_PROFILES.find(
      (profile) => profile.workflowId === workflowId,
    ) ?? null
  );
}
