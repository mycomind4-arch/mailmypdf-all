import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "dispute-collections-on-credit-report",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/dispute-collections-on-credit-report",
  startPath: "/dispute-mail/workflows/dispute-collections-on-credit-report/start",
  title: "Dispute Collections On Credit Report",
  seoTitle: "Dispute Collections On Credit Report | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Dispute Collections On Credit Report workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Dispute Collections On Credit Report",
  heroDescription: "Use a guided dispute collections on credit report workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
