import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "regulatory-deficiency-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/regulatory-deficiency-notice-response",
  startPath: "/notice-respond/workflows/regulatory-deficiency-notice-response/start",
  title: "Regulatory Deficiency Notice Response",
  seoTitle: "Regulatory Deficiency Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Regulatory Deficiency Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Regulatory Deficiency Notice Response",
  heroDescription: "Use a guided regulatory deficiency notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
