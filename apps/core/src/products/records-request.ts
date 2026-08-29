/**
 * RecordsRequest — product definition.
 *
 * A workflow family for public-records and agency-record requests. The
 * vertical-specific intelligence lives in `records-request/workflows.ts`;
 * MailMyPDF owns identity, documents, payments, mailing, tracking, and proof.
 */

import { RECORDS_REQUEST_WORKFLOWS } from "./records-request/workflows";

export const recordsRequestProduct = {
  id: "records-request",
  name: "RecordsRequest",
  tagline: "The government has your records. Ask for them.",
  description: "Prepare specific records requests, review the request before sending, and mail with proof through MailMyPDF.",
  requestTypes: RECORDS_REQUEST_WORKFLOWS.map((workflow) => workflow.requestType),
  workflowCount: RECORDS_REQUEST_WORKFLOWS.length,
  feeWaiverOptions: [
    "Request fee waiver (news/public interest)",
    "Request expedited processing",
    "Both fee waiver and expedited processing",
    "Neither — I'll pay applicable fees",
  ],
} as const;

export type RecordsRequestType = (typeof recordsRequestProduct.requestTypes)[number];
export type FeeWaiverOption = (typeof recordsRequestProduct.feeWaiverOptions)[number];

export type RecordsRequestInput = {
  workflowId?: string;
  requestType: string;
  agencyName: string;
  agencyAddress: string;
  recordsDescription: string;
  timeFrame: string;
  purpose: string;
  feeWaiver: string;
  expeditedProcessing: string;
  requesterName: string;
  requesterOrg: string;
  contactEmail: string;
  contactPhone: string;
  documentText: string;
};

export type RecordsRequestAnalysis = {
  workflowId: string;
  workflowName: string;
  suggestedAgency: string | null;
  statutoryDeadline: string | null;
  deadlineNotes: string | null;
  warnings: string[];
  tips: string[];
};
