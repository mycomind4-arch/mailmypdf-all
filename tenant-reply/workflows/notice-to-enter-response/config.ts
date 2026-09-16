import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "notice-to-enter-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/notice-to-enter-response",
  startPath: "/tenant-reply/workflows/notice-to-enter-response/start",
  title: "Notice To Enter Response",
  seoTitle: "Notice To Enter Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Notice To Enter Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Notice To Enter Response",
  heroDescription: "Use a guided notice to enter response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
