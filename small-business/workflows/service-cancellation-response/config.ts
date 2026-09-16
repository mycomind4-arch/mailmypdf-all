import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "service-cancellation-response",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/service-cancellation-response",
  startPath: "/small-business/workflows/service-cancellation-response/start",
  title: "Service Cancellation Response",
  seoTitle: "Service Cancellation Response | Small Business | MailMyPDF",
  seoDescription: "Use the Service Cancellation Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Service Cancellation Response",
  heroDescription: "Use a guided service cancellation response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
