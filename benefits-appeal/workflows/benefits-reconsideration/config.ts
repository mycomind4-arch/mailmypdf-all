import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-reconsideration",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/benefits-reconsideration",
  startPath: "/benefits-appeal/workflows/benefits-reconsideration/start",
  title: "Benefits Reconsideration",
  seoTitle: "Benefits Reconsideration | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Benefits Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Benefits Reconsideration",
  heroDescription: "Use a guided benefits reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
