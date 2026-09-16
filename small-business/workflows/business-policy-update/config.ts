import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "business-policy-update",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/business-policy-update",
  startPath: "/small-business/workflows/business-policy-update/start",
  title: "Business Policy Update",
  seoTitle: "Business Policy Update | Small Business | MailMyPDF",
  seoDescription: "Use the Business Policy Update workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Business Policy Update",
  heroDescription: "Use a guided business policy update workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
