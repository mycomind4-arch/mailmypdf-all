/**
 * PermitReply — product definition
 *
 * Respond to permit-related notices from government agencies:
 * permit denials, conditions, revocations, inspection findings,
 * variance requests, and code enforcement notices. AI drafts
 * a formal response, they review, and MailMyPDF mails it certified.
 */

export const permitReplyProduct = {
  id: "permit-reply",
  name: "PermitReply",
  tagline: "Respond to permit notices. On the record.",
  description:
    "Received a permit-related notice from a government agency? Draft your response, attach documentation, and mail it certified with proof of delivery.",
  noticeTypes: [
    "Permit denial",
    "Permit conditions / modifications",
    "Permit revocation / suspension",
    "Inspection finding / violation",
    "Code enforcement notice",
    "Variance / special use request",
    "Permit application response",
    "Zoning determination response",
    "Building permit issue",
    "Other permit notice",
  ],
} as const;

export type PermitReplyType = (typeof permitReplyProduct.noticeTypes)[number];

export type PermitReplyInput = {
  noticeType: string;
  agencyName: string;
  agencyAddress: string;
  permitNumber: string;
  noticeDate: string;
  responseDeadline: string;
  noticeSummary: string;
  applicantPosition: string;
  evidenceItems: string;
  propertyAddress: string;
  projectDescription: string;
  applicantName: string;
  applicantAddress: string;
  applicantEmail: string;
  applicantPhone: string;
  documentText: string;
  additionalNotes: string;
};

export type PermitReplyAnalysis = {
  suggestedAction: string | null;
  deadlineInfo: string | null;
  deadlinePassed: boolean;
  warnings: string[];
  tips: string[];
  checklistItems: string[];
  processOverview: string | null;
};
