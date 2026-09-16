import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "fafsa-special-circumstances-appeal",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/fafsa-special-circumstances-appeal",
  startPath: "/appeal-mail/workflows/fafsa-special-circumstances-appeal/start",
  title: "Fafsa Special Circumstances Appeal",
  seoTitle: "Fafsa Special Circumstances Appeal | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Fafsa Special Circumstances Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Fafsa Special Circumstances Appeal",
  heroDescription: "Use a guided fafsa special circumstances appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
