import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "contract-change-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/contract-change-notice",
  startPath: "/small-business/workflows/contract-change-notice/start",
  title: "Contract Change Notice",
  seoTitle: "Contract Change Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Contract Change Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Contract Change Notice",
  heroDescription: "Use a guided contract change notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
