import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "criminal-case-timeline",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/criminal-case-timeline",
  startPath: "/legal-defense/workflows/criminal-case-timeline/start",
  title: "Criminal Case Timeline",
  seoTitle: "Criminal Case Timeline | Legal Defense | MailMyPDF",
  seoDescription: "Use the Criminal Case Timeline workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Criminal Case Timeline",
  heroDescription: "Use a guided criminal case timeline workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
