import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp90-collection-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp90-collection-notice-response",
  startPath: "/notice-respond/workflows/cp90-collection-notice-response/start",
  title: "Cp90 Collection Notice Response",
  seoTitle: "Cp90 Collection Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Cp90 Collection Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Cp90 Collection Notice Response",
  heroDescription: "Use a guided cp90 collection notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
