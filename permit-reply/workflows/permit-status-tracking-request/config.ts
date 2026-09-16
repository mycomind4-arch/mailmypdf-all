import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-status-tracking-request",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-status-tracking-request",
  startPath: "/permit-reply/workflows/permit-status-tracking-request/start",
  title: "Permit Status Tracking Request",
  seoTitle: "Permit Status Tracking Request | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Status Tracking Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Status Tracking Request",
  heroDescription: "Use a guided permit status tracking request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
