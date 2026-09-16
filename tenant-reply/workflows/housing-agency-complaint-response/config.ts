import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "housing-agency-complaint-response",
  sectionId: "tenant-reply",
  sectionName: "Tenant Reply",
  sectionPath: "/tenant-reply",
  path: "/tenant-reply/workflows/housing-agency-complaint-response",
  startPath: "/tenant-reply/workflows/housing-agency-complaint-response/start",
  title: "Housing Agency Complaint Response",
  seoTitle: "Housing Agency Complaint Response | Tenant Reply | MailMyPDF",
  seoDescription: "Use the Housing Agency Complaint Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Tenant Reply workflow",
  heroTitle: "Housing Agency Complaint Response",
  heroDescription: "Use a guided housing agency complaint response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
