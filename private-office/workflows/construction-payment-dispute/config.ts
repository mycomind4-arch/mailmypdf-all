import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "construction-payment-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/construction-payment-dispute",
  startPath: "/private-office/workflows/construction-payment-dispute/start",
  title: "Construction Payment Dispute",
  seoTitle: "Construction Payment Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Construction Payment Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Construction Payment Dispute",
  heroDescription: "Use a guided construction payment dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
