import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "tenant-evidence-package",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/tenant-evidence-package",
  startPath: "/tenant-reply/workflows/tenant-evidence-package/start",
  title: "Tenant Evidence Package",
  seoTitle: "Tenant Evidence Package | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Tenant Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Tenant Evidence Package",
  heroDescription: "Use a guided tenant evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
