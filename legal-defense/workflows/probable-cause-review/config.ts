import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "probable-cause-review",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/probable-cause-review",
  startPath: "/legal-defense/workflows/probable-cause-review/start",
  title: "Probable Cause Review",
  seoTitle: "Probable Cause Review | Legal Defense | MailMyPDF",
  seoDescription: "Use the Probable Cause Review workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Probable Cause Review",
  heroDescription: "Use a guided probable cause review workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
