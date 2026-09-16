import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "maintenance-neglect-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/maintenance-neglect-response",
  startPath: "/tenant-reply/workflows/maintenance-neglect-response/start",
  title: "Maintenance Neglect Response",
  seoTitle: "Maintenance Neglect Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Maintenance Neglect Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Maintenance Neglect Response",
  heroDescription: "Use a guided maintenance neglect response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
