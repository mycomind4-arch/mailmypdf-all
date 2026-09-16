import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-collection-agency",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-collection-agency",
  startPath: "/dispute-mail/workflows/dispute-collection-agency/start",
  title: "Dispute Collection Agency",
  seoTitle: "Dispute Collection Agency | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute Collection Agency workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute Collection Agency",
  heroDescription: "Use a guided dispute collection agency workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
