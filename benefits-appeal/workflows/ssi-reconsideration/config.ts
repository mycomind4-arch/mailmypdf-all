import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "ssi-reconsideration",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/ssi-reconsideration",
  startPath: "/benefits-appeal/workflows/ssi-reconsideration/start",
  title: "SSI Reconsideration",
  seoTitle: "SSI Reconsideration | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the SSI Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "SSI Reconsideration",
  heroDescription: "Use a guided ssi reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
