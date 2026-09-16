import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "customer-dispute-response",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/customer-dispute-response",
  startPath: "/small-business/workflows/customer-dispute-response/start",
  title: "Customer Dispute Response",
  seoTitle: "Customer Dispute Response | Small Business | MailMyPDF",
  seoDescription: "Use the Customer Dispute Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Customer Dispute Response",
  heroDescription: "Use a guided customer dispute response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
