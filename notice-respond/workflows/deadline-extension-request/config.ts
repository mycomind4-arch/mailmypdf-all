import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "deadline-extension-request",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/deadline-extension-request",
  startPath: "/notice-respond/workflows/deadline-extension-request/start",
  title: "Deadline Extension Request",
  seoTitle: "Deadline Extension Request | Notice Respond | MailMyPDF",
  seoDescription: "Use the Deadline Extension Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Deadline Extension Request",
  heroDescription: "Use a guided deadline extension request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
