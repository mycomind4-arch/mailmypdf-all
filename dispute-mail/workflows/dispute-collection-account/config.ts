import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-collection-account",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-collection-account",
  startPath: "/dispute-mail/workflows/dispute-collection-account/start",
  title: "Dispute Collection Account",
  seoTitle: "Dispute Collection Account | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute Collection Account workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute Collection Account",
  heroDescription: "Use a guided dispute collection account workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
