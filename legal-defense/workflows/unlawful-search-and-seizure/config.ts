import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unlawful-search-and-seizure",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/unlawful-search-and-seizure",
  startPath: "/legal-defense/workflows/unlawful-search-and-seizure/start",
  title: "Unlawful Search And Seizure",
  seoTitle: "Unlawful Search And Seizure | Legal Defense | MailMyPDF",
  seoDescription: "Use the Unlawful Search And Seizure workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Unlawful Search And Seizure",
  heroDescription: "Use a guided unlawful search and seizure workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
