import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "impeachment-evidence-tracker",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/impeachment-evidence-tracker",
  startPath: "/legal-defense/workflows/impeachment-evidence-tracker/start",
  title: "Impeachment Evidence Tracker",
  seoTitle: "Impeachment Evidence Tracker | Legal Defense | MailMyPDF",
  seoDescription: "Use the Impeachment Evidence Tracker workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Impeachment Evidence Tracker",
  heroDescription: "Use a guided impeachment evidence tracker workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
