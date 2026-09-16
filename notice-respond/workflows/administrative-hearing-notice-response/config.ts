import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "administrative-hearing-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/administrative-hearing-notice-response",
  startPath: "/notice-respond/workflows/administrative-hearing-notice-response/start",
  title: "Administrative Hearing Notice Response",
  seoTitle: "Administrative Hearing Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Administrative Hearing Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Administrative Hearing Notice Response",
  heroDescription: "Use a guided administrative hearing notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
