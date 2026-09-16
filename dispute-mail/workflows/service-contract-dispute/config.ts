import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "service-contract-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/service-contract-dispute",
  startPath: "/dispute-mail/workflows/service-contract-dispute/start",
  title: "Service Contract Dispute",
  seoTitle: "Service Contract Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Service Contract Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Service Contract Dispute",
  heroDescription: "Use a guided service contract dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
