import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "collection-letter",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/collection-letter",
  startPath: "/small-business/workflows/collection-letter/start",
  title: "Collection Letter",
  seoTitle: "Collection Letter | Small Business | MailMyPDF",
  seoDescription: "Use the Collection Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Collection Letter",
  heroDescription: "Use a guided collection letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
