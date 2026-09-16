import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "price-increase-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/price-increase-notice",
  startPath: "/small-business/workflows/price-increase-notice/start",
  title: "Price Increase Notice",
  seoTitle: "Price Increase Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Price Increase Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Price Increase Notice",
  heroDescription: "Use a guided price increase notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
