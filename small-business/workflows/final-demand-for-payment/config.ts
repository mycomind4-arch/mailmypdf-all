import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "final-demand-for-payment",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/final-demand-for-payment",
  startPath: "/small-business/workflows/final-demand-for-payment/start",
  title: "Final Demand For Payment",
  seoTitle: "Final Demand For Payment | Small Business | MailMyPDF",
  seoDescription: "Use the Final Demand For Payment workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Final Demand For Payment",
  heroDescription: "Use a guided final demand for payment workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
