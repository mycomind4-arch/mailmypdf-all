import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "license-suspension-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/license-suspension-appeal",
  startPath: "/appeal-mail/workflows/license-suspension-appeal/start",
  title: "License Suspension Appeal",
  seoTitle: "License Suspension Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the License Suspension Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "License Suspension Appeal",
  heroDescription: "Use a guided license suspension appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
