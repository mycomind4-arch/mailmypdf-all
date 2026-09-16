import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "credit-card-billing-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/credit-card-billing-dispute",
  startPath: "/dispute-mail/workflows/credit-card-billing-dispute/start",
  title: "Credit Card Billing Dispute",
  seoTitle: "Credit Card Billing Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Credit Card Billing Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Credit Card Billing Dispute",
  heroDescription: "Use a guided credit card billing dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
