/**
 * TenantReply — product definition
 *
 * Tenants respond to notices from landlords: eviction notices,
 * rent increases, lease violations, repair requests, security deposit
 * disputes, and more. AI drafts a formal response letter, they
 * review, and MailMyPDF mails it certified with proof of delivery.
 */

export const tenantReplyProduct = {
  id: "tenant-reply",
  name: "TenantReply",
  tagline: "Respond to your landlord. In writing. On the record.",
  description:
    "Got a notice from your landlord? Draft a formal response, document your position, and mail it certified with proof of delivery.",
  noticeTypes: [
    "Eviction notice",
    "Rent increase notice",
    "Lease violation / cure notice",
    "Lease non-renewal notice",
    "Repair / maintenance request",
    "Security deposit dispute",
    "Entry / access notice response",
    "Lease termination notice",
    "Noise / complaint response",
    "Other landlord communication",
  ],
} as const;

export type TenantReplyType = (typeof tenantReplyProduct.noticeTypes)[number];

export type TenantReplyInput = {
  noticeType: string;
  landlordName: string;
  landlordAddress: string;
  noticeDate: string;
  responseDeadline: string;
  noticeSummary: string;
  tenantPosition: string;
  evidenceItems: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: string;
  tenantName: string;
  tenantAddress: string;
  tenantEmail: string;
  tenantPhone: string;
  documentText: string;
  additionalNotes: string;
};

export type TenantReplyAnalysis = {
  suggestedAction: string | null;
  deadlineInfo: string | null;
  deadlinePassed: boolean;
  warnings: string[];
  tips: string[];
  checklistItems: string[];
  rightsSummary: string | null;
};
