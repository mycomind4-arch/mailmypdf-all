import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "attorney-case-brief",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/attorney-case-brief",
  startPath: "/legal-defense/workflows/attorney-case-brief/start",
  title: "Attorney Case Brief",
  seoTitle: "Attorney Case Brief | Legal Defense | MailMyPDF",
  seoDescription: "Use the Attorney Case Brief workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Attorney Case Brief",
  heroDescription: "Use a guided attorney case brief workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
