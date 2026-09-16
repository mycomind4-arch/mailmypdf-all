import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "payment-demand",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/payment-demand",
  startPath: "/small-business/workflows/payment-demand/start",
  title: "Payment Demand",
  seoTitle: "Payment Demand | Small Business | MailMyPDF",
  seoDescription: "Use the Payment Demand workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Payment Demand",
  heroDescription: "Use a guided payment demand workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
