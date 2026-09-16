import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "debt-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/debt-dispute",
  startPath: "/dispute-mail/workflows/debt-dispute/start",
  title: "Debt Dispute",
  seoTitle: "Debt Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Debt Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Debt Dispute",
  heroDescription: "Use a guided debt dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
