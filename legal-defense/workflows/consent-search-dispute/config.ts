import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "consent-search-dispute",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/consent-search-dispute",
  startPath: "/legal-defense/workflows/consent-search-dispute/start",
  title: "Consent Search Dispute",
  seoTitle: "Consent Search Dispute | Legal Defense | MailMyPDF",
  seoDescription: "Use the Consent Search Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Consent Search Dispute",
  heroDescription: "Use a guided consent search dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
