import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "compliance-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/compliance-notice",
  startPath: "/small-business/workflows/compliance-notice/start",
  title: "Compliance Notice",
  seoTitle: "Compliance Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Compliance Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Compliance Notice",
  heroDescription: "Use a guided compliance notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
