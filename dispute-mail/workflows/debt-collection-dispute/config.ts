import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "debt-collection-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/debt-collection-dispute",
  startPath: "/dispute-mail/workflows/debt-collection-dispute/start",
  title: "Debt Collection Dispute",
  seoTitle: "Debt Collection Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Debt Collection Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Debt Collection Dispute",
  heroDescription: "Use a guided debt collection dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
