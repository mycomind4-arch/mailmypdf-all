import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "tenant-notice-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/tenant-notice-response",
  startPath: "/tenant-reply/workflows/tenant-notice-response/start",
  title: "Tenant Notice Response",
  seoTitle: "Tenant Notice Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Tenant Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Tenant Notice Response",
  heroDescription: "Use a guided tenant notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
