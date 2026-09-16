import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "private-matter-evidence-package",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/private-matter-evidence-package",
  startPath: "/private-office/workflows/private-matter-evidence-package/start",
  title: "Private Matter Evidence Package",
  seoTitle: "Private Matter Evidence Package | Private Office | MailMyPDF",
  seoDescription: "Use the Private Matter Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Private Matter Evidence Package",
  heroDescription: "Use a guided private matter evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
