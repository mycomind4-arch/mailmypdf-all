import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "scholarship-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/scholarship-appeal",
  startPath: "/appeal-mail/workflows/scholarship-appeal/start",
  title: "Scholarship Appeal",
  seoTitle: "Scholarship Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Scholarship Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Scholarship Appeal",
  heroDescription: "Use a guided scholarship appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
