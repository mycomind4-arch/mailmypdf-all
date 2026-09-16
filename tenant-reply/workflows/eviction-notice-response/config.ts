import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "eviction-notice-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/eviction-notice-response",
  startPath: "/tenant-reply/workflows/eviction-notice-response/start",
  title: "Eviction Notice Response",
  seoTitle: "Eviction Notice Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Eviction Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Eviction Notice Response",
  heroDescription: "Use a guided eviction notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
