import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/permit-records-request",
  startPath: "/records-request/workflows/permit-records-request/start",
  title: "Permit Records Request",
  seoTitle: "Permit Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Permit Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Permit Records Request",
  heroDescription: "Use a guided permit records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
