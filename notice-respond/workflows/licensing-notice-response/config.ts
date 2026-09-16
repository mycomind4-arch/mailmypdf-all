import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "licensing-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/licensing-notice-response",
  startPath: "/notice-respond/workflows/licensing-notice-response/start",
  title: "Licensing Notice Response",
  seoTitle: "Licensing Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Licensing Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Licensing Notice Response",
  heroDescription: "Use a guided licensing notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
