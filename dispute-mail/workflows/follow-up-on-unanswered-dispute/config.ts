import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "follow-up-on-unanswered-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/follow-up-on-unanswered-dispute",
  startPath: "/dispute-mail/workflows/follow-up-on-unanswered-dispute/start",
  title: "Follow Up On Unanswered Dispute",
  seoTitle: "Follow Up On Unanswered Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Follow Up On Unanswered Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Follow Up On Unanswered Dispute",
  heroDescription: "Use a guided follow up on unanswered dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
