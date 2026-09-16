import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "request-for-reconsideration",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/request-for-reconsideration",
  startPath: "/immigration-mail/workflows/request-for-reconsideration/start",
  title: "Request For Reconsideration",
  seoTitle: "Request For Reconsideration | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Request For Reconsideration workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Request For Reconsideration",
  heroDescription: "Use a guided request for reconsideration workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
