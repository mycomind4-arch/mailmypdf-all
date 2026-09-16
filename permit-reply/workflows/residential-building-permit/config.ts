import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "residential-building-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/residential-building-permit",
  startPath: "/permit-reply/workflows/residential-building-permit/start",
  title: "Residential Building Permit",
  seoTitle: "Residential Building Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Residential Building Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Residential Building Permit",
  heroDescription: "Use a guided residential building permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
