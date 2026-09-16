import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "lease-amendment-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/lease-amendment-response",
  startPath: "/tenant-reply/workflows/lease-amendment-response/start",
  title: "Lease Amendment Response",
  seoTitle: "Lease Amendment Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Lease Amendment Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Lease Amendment Response",
  heroDescription: "Use a guided lease amendment response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
