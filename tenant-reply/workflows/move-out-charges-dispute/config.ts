import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "move-out-charges-dispute",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/move-out-charges-dispute",
  startPath: "/tenant-reply/workflows/move-out-charges-dispute/start",
  title: "Move Out Charges Dispute",
  seoTitle: "Move Out Charges Dispute | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Move Out Charges Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Move Out Charges Dispute",
  heroDescription: "Use a guided move out charges dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
