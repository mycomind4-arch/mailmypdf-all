import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "credit-report-collections-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/credit-report-collections-dispute",
  startPath: "/dispute-mail/workflows/credit-report-collections-dispute/start",
  title: "Credit Report Collections Dispute",
  seoTitle: "Credit Report Collections Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Credit Report Collections Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Credit Report Collections Dispute",
  heroDescription: "Use a guided credit report collections dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
