import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "stolen-vehicle-arrest-defense",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/stolen-vehicle-arrest-defense",
  startPath: "/legal-defense/workflows/stolen-vehicle-arrest-defense/start",
  title: "Stolen Vehicle Arrest Defense",
  seoTitle: "Stolen Vehicle Arrest Defense | Legal Defense | MailMyPDF",
  seoDescription: "Use the Stolen Vehicle Arrest Defense workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Stolen Vehicle Arrest Defense",
  heroDescription: "Use a guided stolen vehicle arrest defense workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
