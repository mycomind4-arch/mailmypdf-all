import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "defense-evidence-package",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/defense-evidence-package",
  startPath: "/legal-defense/workflows/defense-evidence-package/start",
  title: "Defense Evidence Package",
  seoTitle: "Defense Evidence Package | Legal Defense | MailMyPDF",
  seoDescription: "Use the Defense Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Defense Evidence Package",
  heroDescription: "Use a guided defense evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
