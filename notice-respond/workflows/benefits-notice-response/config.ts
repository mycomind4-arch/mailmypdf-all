import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/benefits-notice-response",
  startPath: "/notice-respond/workflows/benefits-notice-response/start",
  title: "Benefits Notice Response",
  seoTitle: "Benefits Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Benefits Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Benefits Notice Response",
  heroDescription: "Use a guided benefits notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
