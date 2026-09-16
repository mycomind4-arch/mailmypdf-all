import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "discovery-deficiency-follow-up",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/discovery-deficiency-follow-up",
  startPath: "/legal-defense/workflows/discovery-deficiency-follow-up/start",
  title: "Discovery Deficiency Follow Up",
  seoTitle: "Discovery Deficiency Follow Up | Legal Defense | MailMyPDF",
  seoDescription: "Use the Discovery Deficiency Follow Up workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Discovery Deficiency Follow Up",
  heroDescription: "Use a guided discovery deficiency follow up workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
