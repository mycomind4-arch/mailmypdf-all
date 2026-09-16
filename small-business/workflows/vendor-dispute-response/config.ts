import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "vendor-dispute-response",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/vendor-dispute-response",
  startPath: "/small-business/workflows/vendor-dispute-response/start",
  title: "Vendor Dispute Response",
  seoTitle: "Vendor Dispute Response | Small Business | MailMyPDF",
  seoDescription: "Use the Vendor Dispute Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Vendor Dispute Response",
  heroDescription: "Use a guided vendor dispute response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
