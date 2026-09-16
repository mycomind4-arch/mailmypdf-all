import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "contractor-defect-dispute",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/contractor-defect-dispute",
  startPath: "/private-office/workflows/contractor-defect-dispute/start",
  title: "Contractor Defect Dispute",
  seoTitle: "Contractor Defect Dispute | Private Office | MailMyPDF",
  seoDescription: "Use the Contractor Defect Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Contractor Defect Dispute",
  heroDescription: "Use a guided contractor defect dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
