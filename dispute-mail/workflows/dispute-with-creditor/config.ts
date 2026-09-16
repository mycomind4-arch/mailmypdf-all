import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-with-creditor",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-with-creditor",
  startPath: "/dispute-mail/workflows/dispute-with-creditor/start",
  title: "Dispute With Creditor",
  seoTitle: "Dispute With Creditor | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute With Creditor workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute With Creditor",
  heroDescription: "Use a guided dispute with creditor workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
