import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-billing-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/insurance-billing-dispute",
  startPath: "/dispute-mail/workflows/insurance-billing-dispute/start",
  title: "Insurance Billing Dispute",
  seoTitle: "Insurance Billing Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Insurance Billing Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Insurance Billing Dispute",
  heroDescription: "Use a guided insurance billing dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
