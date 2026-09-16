import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "immigration-deadline-response",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/immigration-deadline-response",
  startPath: "/immigration-mail/workflows/immigration-deadline-response/start",
  title: "Immigration Deadline Response",
  seoTitle: "Immigration Deadline Response | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Immigration Deadline Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Immigration Deadline Response",
  heroDescription: "Use a guided immigration deadline response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
