import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "charging-document-analysis",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/charging-document-analysis",
  startPath: "/legal-defense/workflows/charging-document-analysis/start",
  title: "Charging Document Analysis",
  seoTitle: "Charging Document Analysis | Legal Defense | MailMyPDF",
  seoDescription: "Use the Charging Document Analysis workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Charging Document Analysis",
  heroDescription: "Use a guided charging document analysis workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
