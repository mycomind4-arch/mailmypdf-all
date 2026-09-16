import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "contractor-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/contractor-dispute",
  startPath: "/private-office/workflows/contractor-dispute/start",
  title: "Contractor Dispute",
  seoTitle: "Contractor Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Contractor Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Contractor Dispute",
  heroDescription: "Use a guided contractor dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
