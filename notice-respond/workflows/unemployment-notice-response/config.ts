import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unemployment-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/unemployment-notice-response",
  startPath: "/notice-respond/workflows/unemployment-notice-response/start",
  title: "Unemployment Notice Response",
  seoTitle: "Unemployment Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Unemployment Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Unemployment Notice Response",
  heroDescription: "Use a guided unemployment notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
