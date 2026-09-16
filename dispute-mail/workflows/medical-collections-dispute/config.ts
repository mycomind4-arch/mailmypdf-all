import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medical-collections-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/medical-collections-dispute",
  startPath: "/dispute-mail/workflows/medical-collections-dispute/start",
  title: "Medical Collections Dispute",
  seoTitle: "Medical Collections Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Medical Collections Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Medical Collections Dispute",
  heroDescription: "Use a guided medical collections dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
