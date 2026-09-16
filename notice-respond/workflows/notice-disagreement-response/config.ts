import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "notice-disagreement-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/notice-disagreement-response",
  startPath: "/notice-respond/workflows/notice-disagreement-response/start",
  title: "Notice Disagreement Response",
  seoTitle: "Notice Disagreement Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Notice Disagreement Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Notice Disagreement Response",
  heroDescription: "Use a guided notice disagreement response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
