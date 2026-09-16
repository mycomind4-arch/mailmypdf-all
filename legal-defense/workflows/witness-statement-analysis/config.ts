import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "witness-statement-analysis",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/witness-statement-analysis",
  startPath: "/legal-defense/workflows/witness-statement-analysis/start",
  title: "Witness Statement Analysis",
  seoTitle: "Witness Statement Analysis | Legal Defense | MailMyPDF",
  seoDescription: "Use the Witness Statement Analysis workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Witness Statement Analysis",
  heroDescription: "Use a guided witness statement analysis workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
