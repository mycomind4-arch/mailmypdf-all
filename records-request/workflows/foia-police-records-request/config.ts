import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "foia-police-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/foia-police-records-request",
  startPath: "/records-request/workflows/foia-police-records-request/start",
  title: "FOIA Police Records Request",
  seoTitle: "FOIA Police Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the FOIA Police Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "FOIA Police Records Request",
  heroDescription: "Use a guided foia police records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
