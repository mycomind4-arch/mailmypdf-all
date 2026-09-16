import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unpaid-invoice-letter",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/unpaid-invoice-letter",
  startPath: "/small-business/workflows/unpaid-invoice-letter/start",
  title: "Unpaid Invoice Letter",
  seoTitle: "Unpaid Invoice Letter | Small Business | MailMyPDF",
  seoDescription: "Use the Unpaid Invoice Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Unpaid Invoice Letter",
  heroDescription: "Use a guided unpaid invoice letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
