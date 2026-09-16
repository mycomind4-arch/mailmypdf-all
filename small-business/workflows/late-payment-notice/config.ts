import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "late-payment-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/late-payment-notice",
  startPath: "/small-business/workflows/late-payment-notice/start",
  title: "Late Payment Notice",
  seoTitle: "Late Payment Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Late Payment Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Late Payment Notice",
  heroDescription: "Use a guided late payment notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
