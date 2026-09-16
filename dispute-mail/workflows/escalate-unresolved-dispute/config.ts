import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "escalate-unresolved-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/escalate-unresolved-dispute",
  startPath: "/dispute-mail/workflows/escalate-unresolved-dispute/start",
  title: "Escalate Unresolved Dispute",
  seoTitle: "Escalate Unresolved Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Escalate Unresolved Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Escalate Unresolved Dispute",
  heroDescription: "Use a guided escalate unresolved dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
