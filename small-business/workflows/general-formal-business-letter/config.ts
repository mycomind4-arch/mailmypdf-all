import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "general-formal-business-letter",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/general-formal-business-letter",
  startPath: "/small-business/workflows/general-formal-business-letter/start",
  title: "General Formal Business Letter",
  seoTitle: "General Formal Business Letter | Small Business | MailMyPDF",
  seoDescription: "Use the General Formal Business Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "General Formal Business Letter",
  heroDescription: "Use a guided general formal business letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
