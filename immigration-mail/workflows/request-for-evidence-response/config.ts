import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "request-for-evidence-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/request-for-evidence-response",
  startPath: "/immigration-mail/workflows/request-for-evidence-response/start",
  title: "Request For Evidence Response",
  seoTitle: "Request For Evidence Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Request For Evidence Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Request For Evidence Response",
  heroDescription: "Use a guided request for evidence response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
