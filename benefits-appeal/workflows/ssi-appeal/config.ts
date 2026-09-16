import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssi-appeal",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssi-appeal",
  startPath: "/benefits-appeal/workflows/ssi-appeal/start",
  title: "SSI Appeal",
  seoTitle: "SSI Appeal | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSI Appeal workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSI Appeal",
  heroDescription: "Use a guided ssi appeal workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
