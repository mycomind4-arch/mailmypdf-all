import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "wire-fraud-recovery-package",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/wire-fraud-recovery-package",
  startPath: "/private-office/workflows/wire-fraud-recovery-package/start",
  title: "Wire Fraud Recovery Package",
  seoTitle: "Wire Fraud Recovery Package | Private Office | MailMyPDF",
  seoDescription: "Use the Wire Fraud Recovery Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Wire Fraud Recovery Package",
  heroDescription: "Use a guided wire fraud recovery package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
