import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "officer-statement-comparison",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/officer-statement-comparison",
  startPath: "/legal-defense/workflows/officer-statement-comparison/start",
  title: "Officer Statement Comparison",
  seoTitle: "Officer Statement Comparison | Legal Defense | MailMyPDF",
  seoDescription: "Use the Officer Statement Comparison workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Officer Statement Comparison",
  heroDescription: "Use a guided officer statement comparison workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
