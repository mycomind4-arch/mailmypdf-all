import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "request-reconsideration",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/request-reconsideration",
  startPath: "/appeal-mail/workflows/request-reconsideration/start",
  title: "Request Reconsideration",
  seoTitle: "Request Reconsideration | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Request Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Request Reconsideration",
  heroDescription: "Use a guided request reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
