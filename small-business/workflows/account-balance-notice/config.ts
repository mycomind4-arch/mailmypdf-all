import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "account-balance-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/account-balance-notice",
  startPath: "/small-business/workflows/account-balance-notice/start",
  title: "Account Balance Notice",
  seoTitle: "Account Balance Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Account Balance Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Account Balance Notice",
  heroDescription: "Use a guided account balance notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
