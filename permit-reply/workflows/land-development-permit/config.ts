import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "land-development-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/land-development-permit",
  startPath: "/permit-reply/workflows/land-development-permit/start",
  title: "Land Development Permit",
  seoTitle: "Land Development Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Land Development Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Land Development Permit",
  heroDescription: "Use a guided land development permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
