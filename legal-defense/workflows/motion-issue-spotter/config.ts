import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "motion-issue-spotter",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/motion-issue-spotter",
  startPath: "/legal-defense/workflows/motion-issue-spotter/start",
  title: "Motion Issue Spotter",
  seoTitle: "Motion Issue Spotter | Legal Defense | MailMyPDF",
  seoDescription: "Use the Motion Issue Spotter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Motion Issue Spotter",
  heroDescription: "Use a guided motion issue spotter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
