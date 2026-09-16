import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-payment-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/insurance-payment-dispute",
  startPath: "/dispute-mail/workflows/insurance-payment-dispute/start",
  title: "Insurance Payment Dispute",
  seoTitle: "Insurance Payment Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Insurance Payment Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Insurance Payment Dispute",
  heroDescription: "Use a guided insurance payment dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
