import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "evidence-request-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/evidence-request-response",
  startPath: "/notice-respond/workflows/evidence-request-response/start",
  title: "Evidence Request Response",
  seoTitle: "Evidence Request Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Evidence Request Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Evidence Request Response",
  heroDescription: "Use a guided evidence request response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
