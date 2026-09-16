import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "billing-error-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/billing-error-dispute",
  startPath: "/dispute-mail/workflows/billing-error-dispute/start",
  title: "Billing Error Dispute",
  seoTitle: "Billing Error Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Billing Error Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Billing Error Dispute",
  heroDescription: "Use a guided billing error dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
