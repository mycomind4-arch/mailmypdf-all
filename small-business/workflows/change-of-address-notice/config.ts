import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "change-of-address-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/change-of-address-notice",
  startPath: "/small-business/workflows/change-of-address-notice/start",
  title: "Change Of Address Notice",
  seoTitle: "Change Of Address Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Change Of Address Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Change Of Address Notice",
  heroDescription: "Use a guided change of address notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
