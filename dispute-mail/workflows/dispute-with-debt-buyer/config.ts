import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-with-debt-buyer",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-with-debt-buyer",
  startPath: "/dispute-mail/workflows/dispute-with-debt-buyer/start",
  title: "Dispute With Debt Buyer",
  seoTitle: "Dispute With Debt Buyer | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute With Debt Buyer workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute With Debt Buyer",
  heroDescription: "Use a guided dispute with debt buyer workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
