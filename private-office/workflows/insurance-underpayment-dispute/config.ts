import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-underpayment-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/insurance-underpayment-dispute",
  startPath: "/private-office/workflows/insurance-underpayment-dispute/start",
  title: "Insurance Underpayment Dispute",
  seoTitle: "Insurance Underpayment Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Insurance Underpayment Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Insurance Underpayment Dispute",
  heroDescription: "Use a guided insurance underpayment dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
