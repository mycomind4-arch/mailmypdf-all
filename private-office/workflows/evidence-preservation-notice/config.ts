import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "evidence-preservation-notice",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/evidence-preservation-notice",
  startPath: "/private-office/workflows/evidence-preservation-notice/start",
  title: "Evidence Preservation Notice",
  seoTitle: "Evidence Preservation Notice | Private Office | MailMyPDF",
  seoDescription: "Use the Evidence Preservation Notice workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Evidence Preservation Notice",
  heroDescription: "Use a guided evidence preservation notice workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
