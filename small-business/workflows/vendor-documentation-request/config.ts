import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "vendor-documentation-request",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/vendor-documentation-request",
  startPath: "/small-business/workflows/vendor-documentation-request/start",
  title: "Vendor Documentation Request",
  seoTitle: "Vendor Documentation Request | Small Business | MailMyPDF",
  seoDescription: "Use the Vendor Documentation Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Vendor Documentation Request",
  heroDescription: "Use a guided vendor documentation request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
