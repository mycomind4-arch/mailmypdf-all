import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-hearing-preparation",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/benefits-hearing-preparation",
  startPath: "/benefits-appeal/workflows/benefits-hearing-preparation/start",
  title: "Benefits Hearing Preparation",
  seoTitle: "Benefits Hearing Preparation | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Benefits Hearing Preparation workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Benefits Hearing Preparation",
  heroDescription: "Use a guided benefits hearing preparation workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
