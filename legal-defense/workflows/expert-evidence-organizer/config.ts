import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "expert-evidence-organizer",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/expert-evidence-organizer",
  startPath: "/legal-defense/workflows/expert-evidence-organizer/start",
  title: "Expert Evidence Organizer",
  seoTitle: "Expert Evidence Organizer | Legal Defense | MailMyPDF",
  seoDescription: "Use the Expert Evidence Organizer workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Expert Evidence Organizer",
  heroDescription: "Use a guided expert evidence organizer workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
