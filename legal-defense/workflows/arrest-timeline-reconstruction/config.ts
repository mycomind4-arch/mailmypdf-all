import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "arrest-timeline-reconstruction",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/arrest-timeline-reconstruction",
  startPath: "/legal-defense/workflows/arrest-timeline-reconstruction/start",
  title: "Arrest Timeline Reconstruction",
  seoTitle: "Arrest Timeline Reconstruction | Legal Defense | MailMyPDF",
  seoDescription: "Use the Arrest Timeline Reconstruction workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Arrest Timeline Reconstruction",
  heroDescription: "Use a guided arrest timeline reconstruction workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
