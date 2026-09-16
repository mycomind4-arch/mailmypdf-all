import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "exculpatory-evidence-tracker",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/exculpatory-evidence-tracker",
  startPath: "/legal-defense/workflows/exculpatory-evidence-tracker/start",
  title: "Exculpatory Evidence Tracker",
  seoTitle: "Exculpatory Evidence Tracker | Legal Defense | MailMyPDF",
  seoDescription: "Use the Exculpatory Evidence Tracker workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Exculpatory Evidence Tracker",
  heroDescription: "Use a guided exculpatory evidence tracker workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
