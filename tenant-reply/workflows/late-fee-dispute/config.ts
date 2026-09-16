import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "late-fee-dispute",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/late-fee-dispute",
  startPath: "/tenant-reply/workflows/late-fee-dispute/start",
  title: "Late Fee Dispute",
  seoTitle: "Late Fee Dispute | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Late Fee Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Late Fee Dispute",
  heroDescription: "Use a guided late fee dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
