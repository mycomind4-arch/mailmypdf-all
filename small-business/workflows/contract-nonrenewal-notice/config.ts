import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "contract-nonrenewal-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/contract-nonrenewal-notice",
  startPath: "/small-business/workflows/contract-nonrenewal-notice/start",
  title: "Contract Nonrenewal Notice",
  seoTitle: "Contract Nonrenewal Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Contract Nonrenewal Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Contract Nonrenewal Notice",
  heroDescription: "Use a guided contract nonrenewal notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
