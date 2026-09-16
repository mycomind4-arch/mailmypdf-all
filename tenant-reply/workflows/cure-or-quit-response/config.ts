import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cure-or-quit-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/cure-or-quit-response",
  startPath: "/tenant-reply/workflows/cure-or-quit-response/start",
  title: "Cure Or Quit Response",
  seoTitle: "Cure Or Quit Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Cure Or Quit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Cure Or Quit Response",
  heroDescription: "Use a guided cure or quit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
