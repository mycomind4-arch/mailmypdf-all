import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "credit-bureau-dispute-package",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/credit-bureau-dispute-package",
  startPath: "/dispute-mail/workflows/credit-bureau-dispute-package/start",
  title: "Credit Bureau Dispute Package",
  seoTitle: "Credit Bureau Dispute Package | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Credit Bureau Dispute Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Credit Bureau Dispute Package",
  heroDescription: "Use a guided credit bureau dispute package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
