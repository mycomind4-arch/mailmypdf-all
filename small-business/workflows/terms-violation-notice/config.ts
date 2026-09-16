import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "terms-violation-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/terms-violation-notice",
  startPath: "/small-business/workflows/terms-violation-notice/start",
  title: "Terms Violation Notice",
  seoTitle: "Terms Violation Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Terms Violation Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Terms Violation Notice",
  heroDescription: "Use a guided terms violation notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
