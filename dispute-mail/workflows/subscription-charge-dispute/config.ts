import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "subscription-charge-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/subscription-charge-dispute",
  startPath: "/dispute-mail/workflows/subscription-charge-dispute/start",
  title: "Subscription Charge Dispute",
  seoTitle: "Subscription Charge Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Subscription Charge Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Subscription Charge Dispute",
  heroDescription: "Use a guided subscription charge dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
