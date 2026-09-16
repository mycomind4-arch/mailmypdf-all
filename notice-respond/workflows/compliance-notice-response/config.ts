import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "compliance-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/compliance-notice-response",
  startPath: "/notice-respond/workflows/compliance-notice-response/start",
  title: "Compliance Notice Response",
  seoTitle: "Compliance Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Compliance Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Compliance Notice Response",
  heroDescription: "Use a guided compliance notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
