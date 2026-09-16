import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unauthorized-charge-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/unauthorized-charge-dispute",
  startPath: "/dispute-mail/workflows/unauthorized-charge-dispute/start",
  title: "Unauthorized Charge Dispute",
  seoTitle: "Unauthorized Charge Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Unauthorized Charge Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Unauthorized Charge Dispute",
  heroDescription: "Use a guided unauthorized charge dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
