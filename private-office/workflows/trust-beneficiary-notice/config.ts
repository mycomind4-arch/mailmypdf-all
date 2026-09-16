import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "trust-beneficiary-notice",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/trust-beneficiary-notice",
  startPath: "/private-office/workflows/trust-beneficiary-notice/start",
  title: "Trust Beneficiary Notice",
  seoTitle: "Trust Beneficiary Notice | Private Office | MailMyPDF",
  seoDescription: "Use the Trust Beneficiary Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Trust Beneficiary Notice",
  heroDescription: "Use a guided trust beneficiary notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
