import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-evidence-package",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/benefits-evidence-package",
  startPath: "/benefits-appeal/workflows/benefits-evidence-package/start",
  title: "Benefits Evidence Package",
  seoTitle: "Benefits Evidence Package | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Benefits Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Benefits Evidence Package",
  heroDescription: "Use a guided benefits evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
