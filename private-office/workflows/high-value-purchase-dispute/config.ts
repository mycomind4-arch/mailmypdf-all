import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "high-value-purchase-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/high-value-purchase-dispute",
  startPath: "/private-office/workflows/high-value-purchase-dispute/start",
  title: "High Value Purchase Dispute",
  seoTitle: "High Value Purchase Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the High Value Purchase Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "High Value Purchase Dispute",
  heroDescription: "Use a guided high value purchase dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
