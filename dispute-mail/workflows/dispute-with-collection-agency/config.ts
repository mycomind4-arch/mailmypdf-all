import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-with-collection-agency",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-with-collection-agency",
  startPath: "/dispute-mail/workflows/dispute-with-collection-agency/start",
  title: "Dispute With Collection Agency",
  seoTitle: "Dispute With Collection Agency | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute With Collection Agency workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute With Collection Agency",
  heroDescription: "Use a guided dispute with collection agency workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
