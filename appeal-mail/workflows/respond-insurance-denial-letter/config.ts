import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "respond-insurance-denial-letter",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/respond-insurance-denial-letter",
  startPath: "/appeal-mail/workflows/respond-insurance-denial-letter/start",
  title: "Respond Insurance Denial Letter",
  seoTitle: "Respond Insurance Denial Letter | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Respond Insurance Denial Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Respond Insurance Denial Letter",
  heroDescription: "Use a guided respond insurance denial letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
