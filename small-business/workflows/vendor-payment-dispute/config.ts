import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "vendor-payment-dispute",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/vendor-payment-dispute",
  startPath: "/small-business/workflows/vendor-payment-dispute/start",
  title: "Vendor Payment Dispute",
  seoTitle: "Vendor Payment Dispute | Small Business | MailMyPDF",
  seoDescription: "Use the Vendor Payment Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Vendor Payment Dispute",
  heroDescription: "Use a guided vendor payment dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
