import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "charge-off-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/charge-off-dispute",
  startPath: "/dispute-mail/workflows/charge-off-dispute/start",
  title: "Charge Off Dispute",
  seoTitle: "Charge Off Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Charge Off Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Charge Off Dispute",
  heroDescription: "Use a guided charge off dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
