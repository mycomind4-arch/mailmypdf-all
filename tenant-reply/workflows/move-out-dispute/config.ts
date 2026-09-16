import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "move-out-dispute",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/move-out-dispute",
  startPath: "/tenant-reply/workflows/move-out-dispute/start",
  title: "Move Out Dispute",
  seoTitle: "Move Out Dispute | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Move Out Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Move Out Dispute",
  heroDescription: "Use a guided move out dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
