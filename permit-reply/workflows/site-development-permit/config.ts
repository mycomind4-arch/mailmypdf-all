import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "site-development-permit",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/site-development-permit",
  startPath: "/permit-reply/workflows/site-development-permit/start",
  title: "Site Development Permit",
  seoTitle: "Site Development Permit | Permit Reply | MailMyPDF",
  seoDescription: "Use the Site Development Permit workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Site Development Permit",
  heroDescription: "Use a guided site development permit workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
