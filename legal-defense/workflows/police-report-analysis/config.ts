import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "police-report-analysis",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/police-report-analysis",
  startPath: "/legal-defense/workflows/police-report-analysis/start",
  title: "Police Report Analysis",
  seoTitle: "Police Report Analysis | Legal Defense | MailMyPDF",
  seoDescription: "Use the Police Report Analysis workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Police Report Analysis",
  heroDescription: "Use a guided police report analysis workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
