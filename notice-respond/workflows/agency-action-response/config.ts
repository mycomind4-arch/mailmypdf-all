import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "agency-action-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/agency-action-response",
  startPath: "/notice-respond/workflows/agency-action-response/start",
  title: "Agency Action Response",
  seoTitle: "Agency Action Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the Agency Action Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Agency Action Response",
  heroDescription: "Use a guided agency action response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
