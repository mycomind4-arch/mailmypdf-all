import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "state-revenue-department-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/state-revenue-department-notice-response",
  startPath: "/notice-respond/workflows/state-revenue-department-notice-response/start",
  title: "State Revenue Department Notice Response",
  seoTitle: "State Revenue Department Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the State Revenue Department Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "State Revenue Department Notice Response",
  heroDescription: "Use a guided state revenue department notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
