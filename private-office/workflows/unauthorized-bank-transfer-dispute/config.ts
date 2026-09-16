import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unauthorized-bank-transfer-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/unauthorized-bank-transfer-dispute",
  startPath: "/private-office/workflows/unauthorized-bank-transfer-dispute/start",
  title: "Unauthorized Bank Transfer Dispute",
  seoTitle: "Unauthorized Bank Transfer Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Unauthorized Bank Transfer Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Unauthorized Bank Transfer Dispute",
  heroDescription: "Use a guided unauthorized bank transfer dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
