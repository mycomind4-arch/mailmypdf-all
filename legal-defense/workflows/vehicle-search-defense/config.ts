import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "vehicle-search-defense",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/vehicle-search-defense",
  startPath: "/legal-defense/workflows/vehicle-search-defense/start",
  title: "Vehicle Search Defense",
  seoTitle: "Vehicle Search Defense | Legal Defense | MailMyPDF",
  seoDescription: "Use the Vehicle Search Defense workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Vehicle Search Defense",
  heroDescription: "Use a guided vehicle search defense workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
