import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "debt-validation",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/debt-validation",
  startPath: "/dispute-mail/workflows/debt-validation/start",
  title: "Debt Validation",
  seoTitle: "Debt Validation | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Debt Validation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Debt Validation",
  heroDescription: "Use a guided debt validation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
