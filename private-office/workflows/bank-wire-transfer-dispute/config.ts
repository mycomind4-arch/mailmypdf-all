import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "bank-wire-transfer-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/bank-wire-transfer-dispute",
  startPath: "/private-office/workflows/bank-wire-transfer-dispute/start",
  title: "Bank Wire Transfer Dispute",
  seoTitle: "Bank Wire Transfer Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Bank Wire Transfer Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Bank Wire Transfer Dispute",
  heroDescription: "Use a guided bank wire transfer dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
