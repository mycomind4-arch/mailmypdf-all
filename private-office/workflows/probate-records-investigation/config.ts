import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "probate-records-investigation",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/probate-records-investigation",
  startPath: "/private-office/workflows/probate-records-investigation/start",
  title: "Probate Records Investigation",
  seoTitle: "Probate Records Investigation | Private Office | MailMyPDF",
  seoDescription: "Use the Probate Records Investigation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Probate Records Investigation",
  heroDescription: "Use a guided probate records investigation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
