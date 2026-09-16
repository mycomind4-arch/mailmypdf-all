import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssdi-reconsideration",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssdi-reconsideration",
  startPath: "/benefits-appeal/workflows/ssdi-reconsideration/start",
  title: "SSDI Reconsideration",
  seoTitle: "SSDI Reconsideration | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSDI Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSDI Reconsideration",
  heroDescription: "Use a guided ssdi reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
