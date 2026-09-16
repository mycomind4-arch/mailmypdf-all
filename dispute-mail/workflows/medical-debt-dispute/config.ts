import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "medical-debt-dispute",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/medical-debt-dispute",
  startPath: "/dispute-mail/workflows/medical-debt-dispute/start",
  title: "Medical Debt Dispute",
  seoTitle: "Medical Debt Dispute | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Medical Debt Dispute workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Medical Debt Dispute",
  heroDescription: "Use a guided medical debt dispute workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
