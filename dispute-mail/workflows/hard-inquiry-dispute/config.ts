import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "hard-inquiry-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/hard-inquiry-dispute",
  startPath: "/dispute-mail/workflows/hard-inquiry-dispute/start",
  title: "Hard Inquiry Dispute",
  seoTitle: "Hard Inquiry Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Hard Inquiry Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Hard Inquiry Dispute",
  heroDescription: "Use a guided hard inquiry dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
