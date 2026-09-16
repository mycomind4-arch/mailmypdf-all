import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "discovery-request-package",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/discovery-request-package",
  startPath: "/legal-defense/workflows/discovery-request-package/start",
  title: "Discovery Request Package",
  seoTitle: "Discovery Request Package | Legal Defense | MailMyPDF",
  seoDescription: "Use the Discovery Request Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Discovery Request Package",
  heroDescription: "Use a guided discovery request package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
