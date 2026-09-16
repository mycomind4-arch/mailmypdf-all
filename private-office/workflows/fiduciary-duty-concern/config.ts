import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "fiduciary-duty-concern",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/fiduciary-duty-concern",
  startPath: "/private-office/workflows/fiduciary-duty-concern/start",
  title: "Fiduciary Duty Concern",
  seoTitle: "Fiduciary Duty Concern | Private Office | MailMyPDF",
  seoDescription: "Use the Fiduciary Duty Concern workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Fiduciary Duty Concern",
  heroDescription: "Use a guided fiduciary duty concern workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
