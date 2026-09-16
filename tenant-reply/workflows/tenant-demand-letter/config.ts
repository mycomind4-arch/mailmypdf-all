import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "tenant-demand-letter",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/tenant-demand-letter",
  startPath: "/tenant-reply/workflows/tenant-demand-letter/start",
  title: "Tenant Demand Letter",
  seoTitle: "Tenant Demand Letter | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Tenant Demand Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Tenant Demand Letter",
  heroDescription: "Use a guided tenant demand letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
