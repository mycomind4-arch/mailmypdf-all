import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "plumbing-permit-response",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/plumbing-permit-response",
  startPath: "/permit-reply/workflows/plumbing-permit-response/start",
  title: "Plumbing Permit Response",
  seoTitle: "Plumbing Permit Response | Permit Reply | MailMyPDF",
  seoDescription: "Use the Plumbing Permit Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Plumbing Permit Response",
  heroDescription: "Use a guided plumbing permit response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
