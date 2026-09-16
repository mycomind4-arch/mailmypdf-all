import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "financial-aid-suspension-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/financial-aid-suspension-appeal",
  startPath: "/appeal-mail/workflows/financial-aid-suspension-appeal/start",
  title: "Financial Aid Suspension Appeal",
  seoTitle: "Financial Aid Suspension Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Financial Aid Suspension Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Financial Aid Suspension Appeal",
  heroDescription: "Use a guided financial aid suspension appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
