import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "consumer-evidence-package",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/consumer-evidence-package",
  startPath: "/dispute-mail/workflows/consumer-evidence-package/start",
  title: "Consumer Evidence Package",
  seoTitle: "Consumer Evidence Package | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Consumer Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Consumer Evidence Package",
  heroDescription: "Use a guided consumer evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
