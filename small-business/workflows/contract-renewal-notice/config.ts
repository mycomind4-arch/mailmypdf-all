import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "contract-renewal-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/contract-renewal-notice",
  startPath: "/small-business/workflows/contract-renewal-notice/start",
  title: "Contract Renewal Notice",
  seoTitle: "Contract Renewal Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Contract Renewal Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Contract Renewal Notice",
  heroDescription: "Use a guided contract renewal notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
