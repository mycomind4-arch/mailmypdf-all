import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "debt-communication-documentation",
  sectionId: "dispute-mail",
  sectionName: "Dispute Mail",
  sectionPath: "/dispute-mail",
  path: "/dispute-mail/workflows/debt-communication-documentation",
  startPath: "/dispute-mail/workflows/debt-communication-documentation/start",
  title: "Debt Communication Documentation",
  seoTitle: "Debt Communication Documentation | Dispute Mail | MailMyPDF",
  seoDescription: "Use the Debt Communication Documentation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Dispute Mail workflow",
  heroTitle: "Debt Communication Documentation",
  heroDescription: "Use a guided debt communication documentation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
