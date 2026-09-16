import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "rent-increase-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/rent-increase-response",
  startPath: "/tenant-reply/workflows/rent-increase-response/start",
  title: "Rent Increase Response",
  seoTitle: "Rent Increase Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Rent Increase Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Rent Increase Response",
  heroDescription: "Use a guided rent increase response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
