import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "service-interruption-notice",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/service-interruption-notice",
  startPath: "/small-business/workflows/service-interruption-notice/start",
  title: "Service Interruption Notice",
  seoTitle: "Service Interruption Notice | Small Business | MailMyPDF",
  seoDescription: "Use the Service Interruption Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Service Interruption Notice",
  heroDescription: "Use a guided service interruption notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
